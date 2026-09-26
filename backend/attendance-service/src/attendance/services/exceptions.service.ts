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
    const validFrom = new Date(dto.validFrom);
    const validUntil = new Date(dto.validUntil);

    if (validUntil <= validFrom) {
      throw new AppException(
        ErrorCodes.VALIDATION_FAILED,
        'validUntil must be after validFrom',
        HttpStatus.BAD_REQUEST,
      );
    }

    const exception = await this.prisma.attendanceException.create({
      data: {
        employeeId: dto.employeeId,
        attendanceDate,
        type: dto.type as unknown as ExceptionType,
        reason: dto.reason,
        attendanceSessionId: dto.attendanceSessionId,
        validFrom,
        validUntil,
        status: ExceptionStatus.PENDING,
      },
    });

    this.logger.log(`Created attendance exception ${exception.id} for employee ${dto.employeeId}`);
    return exception;
  }

  async approveException(id: string, approverUserId: string, dto: ApproveExceptionDto) {
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

    if (exception.status !== ExceptionStatus.PENDING) {
      throw new AppException(
        ErrorCodes.INVALID_STATE_TRANSITION,
        `Exception is already ${exception.status}`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const updated = await this.prisma.attendanceException.update({
      where: { id },
      data: {
        status: dto.status === ApproveStatus.APPROVED ? ExceptionStatus.APPROVED : ExceptionStatus.REJECTED,
        approvedByUserId: approverUserId,
        approvedAt: new Date(),
      },
    });

    this.logger.log(`Exception ${id} was ${dto.status} by user ${approverUserId}`);

    // Notify employee of exception decision
    const isApproved = dto.status === ApproveStatus.APPROVED;
    void this.notificationClient.sendNotification({
      recipientId: exception.employeeId,
      type: isApproved ? 'EXCEPTION_APPROVED' : 'EXCEPTION_REJECTED',
      title: isApproved ? 'Attendance Exception Approved' : 'Attendance Exception Rejected',
      body: isApproved
        ? `Your ${exception.type} exception request has been approved by HR. You may proceed with check-in.`
        : `Your ${exception.type} exception request was rejected by HR.`,
      metadata: {
        exceptionId: exception.id,
        type: exception.type,
        status: updated.status,
      },
    });

    return updated;
  }

  async getExceptions(employeeId?: string, status?: ExceptionStatus) {
    return this.prisma.attendanceException.findMany({
      where: {
        ...(employeeId ? { employeeId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
