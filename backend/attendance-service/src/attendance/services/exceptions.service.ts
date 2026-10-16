import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCodes } from '../../common/constants/error-codes';
import { CreateExceptionDto, ExceptionType } from '../dto/create-exception.dto';
import { ApproveExceptionDto, ApproveStatus } from '../dto/approve-exception.dto';
import { ExceptionStatus } from '@prisma/client';
import { NotificationClientService } from '../../notifications/notification-client.service';

@Injectable()
export class ExceptionsService {
  private readonly logger = new Logger(ExceptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationClient: NotificationClientService,
  ) {}

  async createException(dto: CreateExceptionDto) {
    const attendanceDate = new Date(dto.attendanceDate);
    let validFrom: Date;
    let validUntil: Date;

    if (dto.validFrom && dto.validUntil) {
      validFrom = new Date(dto.validFrom);
      validUntil = new Date(dto.validUntil);
      if (validUntil <= validFrom) {
        throw new AppException(
          ErrorCodes.VALIDATION_FAILED,
          'validUntil must be after validFrom',
          HttpStatus.BAD_REQUEST,
        );
      }
    } else {
      // Default: valid for entire attendance day
      validFrom = new Date(dto.attendanceDate);
      validFrom.setHours(0, 0, 0, 0);
      validUntil = new Date(dto.attendanceDate);
      validUntil.setHours(23, 59, 59, 999);
    }

    // Rule 16: Check for duplicate pending requests for the same date & employee
    const existingPending = await this.prisma.attendanceException.findFirst({
      where: {
        employeeId: dto.employeeId,
        attendanceDate,
        type: dto.type as unknown as ExceptionType,
        status: ExceptionStatus.PENDING,
      },
    });

    if (existingPending) {
      throw new AppException(
        ErrorCodes.VALIDATION_FAILED,
        'A pending special working-hours request already exists for this date. Please wait for HR to review it.',
        HttpStatus.CONFLICT,
      );
    }

    const additionalHours =
      Number(dto.additionalHours) ||
      (Number(dto.additionalMinutes) ? Number(dto.additionalMinutes) / 60 : 0);
    const additionalMinutes =
      Number(dto.additionalMinutes) || Math.round(additionalHours * 60);
    const additionalSeconds = additionalMinutes * 60;

    const metadata: Record<string, any> = {
      ...(dto.metadata || {}),
      additionalHours,
      additionalMinutes,
      additionalSeconds,
      hrEmail: (dto.hrEmail || dto.metadata?.hrEmail || 'hr@company.com').trim().toLowerCase(),
      employeeName: dto.metadata?.employeeName || 'Employee',
      employeeEmail: dto.metadata?.employeeEmail || '',
      dateStr: dto.attendanceDate,
    };

    const count = await this.prisma.attendanceException.count();
    let cleanId = `EXC-${String(count + 1).padStart(3, '0')}`;
    const exists = await this.prisma.attendanceException.findUnique({ where: { id: cleanId } });
    if (exists) {
      cleanId = `EXC-${Date.now().toString().slice(-6)}`;
    }

    const exception = await this.prisma.attendanceException.create({
      data: {
        id: cleanId,
        employeeId: dto.employeeId,
        attendanceDate,
        type: dto.type as unknown as ExceptionType,
        reason: dto.reason?.trim() || 'Special working hours requested',
        attendanceSessionId: dto.attendanceSessionId,
        validFrom,
        validUntil,
        status: ExceptionStatus.PENDING,
        metadata,
      },
    });

    this.logger.log(`Created attendance exception ${exception.id} for employee ${dto.employeeId}`);

    // Notify HR via notification-service (broadcast to HR or specific HR recipient)
    const targetHrEmail = metadata.hrEmail;
    const empName = metadata.employeeName || dto.employeeId;
    void this.notificationClient.sendNotification({
      recipientId: targetHrEmail || 'HR',
      recipientType: 'HR',
      type: 'SPECIAL_WORKING_HOURS_REQUEST',
      title: 'Special Working Hours Request',
      body: `Employee ${empName} requested +${additionalHours} hours for ${dto.attendanceDate}.\nMessage: ${dto.reason?.trim()}`,
      metadata: {
        exceptionId: exception.id,
        employeeId: dto.employeeId,
        employeeName: empName,
        employeeEmail: metadata.employeeEmail,
        hrEmail: targetHrEmail,
        attendanceDate: dto.attendanceDate,
        requestedHours: additionalHours,
        additionalMinutes,
        additionalSeconds,
        reason: dto.reason?.trim(),
        createdAt: exception.createdAt.toISOString(),
      },
    });

    return exception;
  }

  async approveException(id: string, approverUserId: string, dto: ApproveExceptionDto) {
    let exception = await this.prisma.attendanceException.findUnique({
      where: { id },
    });

    if (!exception) {
      // Self-heal: If exception was deleted or missing from DB, recreate it using DTO context
      if (dto.employeeId && dto.attendanceDate) {
        const attDate = new Date(dto.attendanceDate);
        attDate.setHours(0, 0, 0, 0);
        const validFrom = new Date(attDate);
        const validUntil = new Date(attDate);
        validUntil.setHours(23, 59, 59, 999);
        const addHours =
          Number(dto.additionalHours) ||
          (dto.metadata?.additionalHours ? Number(dto.metadata.additionalHours) : 0);
        const addMinutes = Math.round(addHours * 60);

        exception = await this.prisma.attendanceException.create({
          data: {
            id,
            employeeId: dto.employeeId,
            attendanceDate: attDate,
            type: ExceptionType.WORKING_TIME_ADJUSTMENT,
            reason: dto.reason || 'Special working hours requested',
            validFrom,
            validUntil,
            status: ExceptionStatus.PENDING,
            metadata: {
              ...(dto.metadata || {}),
              additionalHours: addHours,
              additionalMinutes: addMinutes,
              additionalSeconds: addMinutes * 60,
              dateStr: dto.attendanceDate,
              reason: dto.reason,
              employeeName: dto.metadata?.employeeName || 'Employee',
              employeeEmail: dto.metadata?.employeeEmail || '',
              hrEmail: dto.metadata?.hrEmail || dto.approverEmail || 'hr@company.com',
            },
          },
        });
        this.logger.log(`Self-healed missing exception ${id} for employee ${dto.employeeId}`);
      } else {
        throw new AppException(
          ErrorCodes.NOT_FOUND,
          'Attendance exception not found',
          HttpStatus.NOT_FOUND,
        );
      }
    }

    if (exception.status !== ExceptionStatus.PENDING) {
      throw new AppException(
        ErrorCodes.INVALID_STATE_TRANSITION,
        `Exception is already ${exception.status}. Cannot re-approve or modify.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const isApproved = dto.status === ApproveStatus.APPROVED;
    const meta = (exception.metadata as Record<string, any>) || {};
    const additionalHours =
      meta.additionalHours ||
      (meta.additionalMinutes ? meta.additionalMinutes / 60 : 0);
    const dateFormatted = exception.attendanceDate.toISOString().split('T')[0];

    const isUuid = (val?: string) =>
      Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim()));

    let approverName = 'HR Administrator';
    if (dto.approverName && !isUuid(dto.approverName)) {
      approverName = dto.approverName.trim();
    } else if (dto.approverEmail) {
      approverName = dto.approverEmail.trim();
    } else if (meta.hrEmail) {
      approverName = meta.hrEmail;
    }

    const updatedMetadata = {
      ...meta,
      approvedByUserId: approverUserId,
      approvedByName: approverName,
      approvedByEmail: dto.approverEmail || meta.hrEmail || 'hr@company.com',
      approvedAt: new Date().toISOString(),
      comment: dto.comment,
    };

    const updated = await this.prisma.attendanceException.update({
      where: { id },
      data: {
        status: isApproved ? ExceptionStatus.APPROVED : ExceptionStatus.REJECTED,
        approvedByUserId: approverUserId,
        approvedAt: new Date(),
        metadata: updatedMetadata,
      },
    });

    this.logger.log(`Exception ${id} was ${dto.status} by user ${approverUserId}`);

    // Notify employee of exception decision
    const empName = meta.employeeName || exception.employeeId;
    if (isApproved) {
      void this.notificationClient.sendNotification({
        recipientId: exception.employeeId,
        type: 'SPECIAL_CONDITION_APPROVED',
        title: 'Special Condition Approved',
        body: `HR approved your request for +${additionalHours} hours on ${dateFormatted}.`,
        metadata: {
          exceptionId: exception.id,
          type: exception.type,
          status: updated.status,
          additionalHours,
          attendanceDate: dateFormatted,
          to: empName,
          from: approverName,
        },
      });

      // Also notify HR so HR receives the approval notification in their notification panel
      const targetHr = meta.hrEmail || 'HR';
      void this.notificationClient.sendNotification({
        recipientId: targetHr,
        recipientType: 'HR',
        type: 'SPECIAL_CONDITION_APPROVED',
        title: 'Special Condition Request Approved',
        body: `${approverName} approved the special request for ${empName} (+${additionalHours}h on ${dateFormatted}).`,
        metadata: {
          exceptionId: exception.id,
          type: exception.type,
          status: updated.status,
          additionalHours,
          attendanceDate: dateFormatted,
          employeeId: exception.employeeId,
          employeeName: empName,
          approvedBy: approverName,
          approvedByUserId: approverUserId,
          comment: dto.comment,
          hrEmail: meta.hrEmail || 'hr@company.com',
          to: 'Human Resources',
          from: approverName,
        },
      });
    } else {
      void this.notificationClient.sendNotification({
        recipientId: exception.employeeId,
        type: 'SPECIAL_CONDITION_REJECTED',
        title: 'Special Condition Request Rejected',
        body: `Your request for additional working hours on ${dateFormatted} was rejected by HR.`,
        metadata: {
          exceptionId: exception.id,
          type: exception.type,
          status: updated.status,
          attendanceDate: dateFormatted,
          to: empName,
          from: approverName,
        },
      });

      // Also notify HR of exception rejection
      const targetHr = meta.hrEmail || 'HR';
      void this.notificationClient.sendNotification({
        recipientId: targetHr,
        recipientType: 'HR',
        type: 'SPECIAL_CONDITION_REJECTED',
        title: 'Special Condition Request Rejected',
        body: `${approverName} rejected the special request for ${empName} on ${dateFormatted}.`,
        metadata: {
          exceptionId: exception.id,
          type: exception.type,
          status: updated.status,
          attendanceDate: dateFormatted,
          employeeId: exception.employeeId,
          employeeName: empName,
          approvedBy: approverName,
          approvedByUserId: approverUserId,
          comment: dto.comment,
          hrEmail: meta.hrEmail || 'hr@company.com',
          to: 'Human Resources',
          from: approverName,
        },
      });
    }

    return updated;
  }

  async getExceptions(employeeId?: string, status?: ExceptionStatus, hrEmail?: string) {
    const empIds = employeeId
      ? employeeId.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    let list = await this.prisma.attendanceException.findMany({
      where: {
        ...(empIds.length > 1
          ? { employeeId: { in: empIds } }
          : empIds.length === 1
          ? { employeeId: empIds[0] }
          : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    if (empIds.length > 0 && list.length === 0) {
      const allForStatus = await this.prisma.attendanceException.findMany({
        where: {
          ...(status ? { status } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });
      list = allForStatus.filter((ex) => {
        if (empIds.includes(ex.employeeId)) return true;
        const meta = (ex.metadata as Record<string, any>) || {};
        if (meta.employeeId && empIds.includes(String(meta.employeeId))) return true;
        if (meta.employeeCode && empIds.includes(String(meta.employeeCode))) return true;
        return false;
      });
    }

    if (hrEmail) {
      const hrLower = hrEmail.trim().toLowerCase();
      return list.filter((ex) => {
        const meta = (ex.metadata as Record<string, any>) || {};
        return !meta.hrEmail || meta.hrEmail.toLowerCase() === hrLower;
      });
    }

    return list;
  }

  async getExceptionById(id: string) {
    const exception = await this.prisma.attendanceException.findUnique({
      where: { id },
    });
    if (!exception) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Attendance exception not found',
        HttpStatus.NOT_FOUND,
      );
    }
    const meta = (exception.metadata as Record<string, any>) || {};
    const isUuid = (val?: string) =>
      Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim()));

    if (meta.approvedByName && isUuid(meta.approvedByName)) {
      meta.approvedByName = meta.approvedByEmail || meta.hrEmail || 'HR Administrator';
    }
    return {
      ...exception,
      metadata: meta,
    };
  }


  async cancelException(id: string) {
    const exception = await this.prisma.attendanceException.findUnique({
      where: { id },
    });
    if (!exception) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'Exception not found', HttpStatus.NOT_FOUND);
    }
    if (exception.status !== ExceptionStatus.PENDING) {
      throw new AppException(
        ErrorCodes.INVALID_STATE_TRANSITION,
        'Cannot cancel an exception that has already been approved or rejected.',
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.prisma.attendanceException.delete({
      where: { id },
    });
    return { success: true, message: 'Attendance exception cancelled' };
  }
}
