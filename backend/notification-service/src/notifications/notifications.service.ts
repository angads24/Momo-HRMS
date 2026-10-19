import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { SseService } from './sse.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sseService: SseService,
    private readonly emailService: EmailService,
  ) {}

  async create(dto: CreateNotificationDto) {
    const count = await this.prisma.notification.count();
    let cleanId = `NOTIF-${String(count + 1).padStart(3, '0')}`;
    const exists = await this.prisma.notification.findUnique({ where: { id: cleanId } });
    if (exists) {
      cleanId = `NOTIF-${Date.now().toString().slice(-6)}`;
    }

    const notification = await this.prisma.notification.create({
      data: {
        id: cleanId,
        recipientId: dto.recipientId,
        recipientType: dto.recipientType || 'EMPLOYEE',
        type: dto.type,
        title: dto.title,
        body: dto.body,
        metadata: dto.metadata || {},
      },
    });

    // Stream in real-time to active in-app connections
    this.sseService.emitNotification({
      recipientId: notification.recipientId,
      recipientType: notification.recipientType,
      notification,
    });

    // Dispatch email notifications via EmailService (SMTP)
    try {
      if (dto.type === 'SPECIAL_WORKING_HOURS_REQUEST') {
        const meta = (dto.metadata || {}) as Record<string, any>;
        const targetHrEmail = meta.hrEmail || (dto.recipientId.includes('@') ? dto.recipientId : 'priya.patil@company.com');
        void this.emailService.sendSpecialWorkingHoursEmail({
          hrEmail: targetHrEmail,
          employeeName: meta.employeeName || 'Employee',
          employeeId: meta.employeeId || dto.recipientId,
          employeeEmail: meta.employeeEmail,
          attendanceDate: meta.attendanceDate || new Date().toISOString().split('T')[0],
          additionalHours: Number(meta.requestedHours || meta.additionalHours || 1),
          reason: meta.reason || dto.body,
          exceptionId: meta.exceptionId || notification.id,
        });
      } else if (dto.type === 'SPECIAL_CONDITION_APPROVED' || dto.type === 'SPECIAL_CONDITION_REJECTED') {
        const meta = (dto.metadata || {}) as Record<string, any>;
        if (meta.employeeEmail) {
          void this.emailService.sendDecisionEmail({
            employeeEmail: meta.employeeEmail,
            employeeName: meta.employeeName || 'Employee',
            status: dto.type === 'SPECIAL_CONDITION_APPROVED' ? 'APPROVED' : 'REJECTED',
            attendanceDate: meta.attendanceDate || '',
            additionalHours: meta.additionalHours,
            comment: meta.comment,
          });
        }
      }
    } catch (emailErr: any) {
      this.logger.warn(`Email delivery dispatch error: ${emailErr.message}`);
    }

    this.logger.log(`Created notification ${notification.id} for ${notification.recipientId} (${notification.type})`);
    return notification;
  }

  private buildRecipientWhere(recipientId?: string, email?: string, role?: string, callerUserId?: string): any {
    const rolesArray = (role || '')
      .split(',')
      .map((r) => r.trim().toUpperCase())
      .filter(Boolean);

    const isRoleAdmin = rolesArray.some((r) => ['ADMIN', 'SUPER_ADMIN'].includes(r));
    const isRoleHr = rolesArray.some((r) => ['HR', 'HR_ADMIN'].includes(r));

    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanRecipientId = recipientId ? recipientId.trim().toUpperCase() : '';

    const isAdmin =
      isRoleAdmin ||
      cleanRecipientId === 'ADMIN' ||
      cleanEmail.includes('admin');

    const isHr =
      isRoleHr ||
      cleanRecipientId === 'HR' ||
      cleanEmail.includes('hr') ||
      cleanEmail.includes('angad');

    const entryLeaveTypes = [
      'CHECKIN_CONFIRMATION',
      'CHECKOUT_CONFIRMATION',
      'GEOFENCE_EXIT_WARNING',
      'GEOFENCE_RETURN',
    ];

    if (isAdmin) {
      // Administrators should NOT get notifications of which employee entered or left the system
      return {
        type: {
          notIn: entryLeaveTypes,
        },
      };
    }

    if (isHr) {
      // HR staff: Include broadcasts, HR team alerts, special requests, approvals, and notifications dispatched by HR staff,
      // but EXCLUDE irrelevant notifications/mails about employees entering or leaving the geofence/system.
      const hrOrConditions: any[] = [
        { recipientId: 'ALL' },
        { recipientType: 'BROADCAST' },
        { recipientType: 'HR' },
        { recipientId: 'HR' },
        { type: 'SPECIAL_WORKING_HOURS_REQUEST' },
        { type: 'SPECIAL_CONDITION_APPROVED' },
        { type: 'SPECIAL_CONDITION_REJECTED' },
        { type: 'EXCEPTION_REQUESTED' },
        { type: 'EXCEPTION_APPROVED' },
        { type: 'EXCEPTION_REJECTED' },
        { metadata: { path: '$.senderRole', equals: 'HR' } },
        { metadata: { path: '$.senderRole', equals: 'HR_ADMIN' } },
      ];

      if (recipientId && recipientId !== 'ALL' && recipientId !== 'HR' && recipientId !== 'ADMIN') {
        hrOrConditions.push({ recipientId });
        hrOrConditions.push({ metadata: { path: '$.employeeCode', equals: recipientId } });
        hrOrConditions.push({ metadata: { path: '$.userId', equals: recipientId } });
        hrOrConditions.push({ metadata: { path: '$.recipientUserId', equals: recipientId } });
        hrOrConditions.push({ metadata: { path: '$.recipientEmployeeId', equals: recipientId } });
        hrOrConditions.push({ metadata: { path: '$.recipientId', equals: recipientId } });
      }

      if (callerUserId && callerUserId !== recipientId && callerUserId !== 'ALL' && callerUserId !== 'HR' && callerUserId !== 'ADMIN') {
        hrOrConditions.push({ recipientId: callerUserId });
        hrOrConditions.push({ metadata: { path: '$.userId', equals: callerUserId } });
        hrOrConditions.push({ metadata: { path: '$.recipientUserId', equals: callerUserId } });
        hrOrConditions.push({ metadata: { path: '$.recipientEmployeeId', equals: callerUserId } });
        hrOrConditions.push({ metadata: { path: '$.senderUserId', equals: callerUserId } });
      }

      if (email) {
        hrOrConditions.push({ recipientId: email });
        hrOrConditions.push({ metadata: { path: '$.email', equals: email } });
        hrOrConditions.push({ metadata: { path: '$.recipientEmail', equals: email } });
        hrOrConditions.push({ metadata: { path: '$.senderEmail', equals: email } });
        hrOrConditions.push({ metadata: { path: '$.hrEmail', equals: email } });
      }

      return {
        AND: [
          {
            type: {
              notIn: entryLeaveTypes,
            },
          },
          {
            OR: hrOrConditions,
          },
        ],
      };
    }

    const employeeOrConditions: any[] = [
      { recipientId: 'ALL' },
      { recipientType: 'BROADCAST' },
    ];

    if (recipientId && recipientId !== 'ALL' && recipientId !== 'HR' && recipientId !== 'ADMIN') {
      employeeOrConditions.push({ recipientId });
      employeeOrConditions.push({ metadata: { path: '$.employeeCode', equals: recipientId } });
      employeeOrConditions.push({ metadata: { path: '$.userId', equals: recipientId } });
      employeeOrConditions.push({ metadata: { path: '$.recipientUserId', equals: recipientId } });
      employeeOrConditions.push({ metadata: { path: '$.recipientEmployeeId', equals: recipientId } });
      employeeOrConditions.push({ metadata: { path: '$.recipientId', equals: recipientId } });
    }

    if (callerUserId && callerUserId !== recipientId && callerUserId !== 'ALL' && callerUserId !== 'HR' && callerUserId !== 'ADMIN') {
      employeeOrConditions.push({ recipientId: callerUserId });
      employeeOrConditions.push({ metadata: { path: '$.userId', equals: callerUserId } });
      employeeOrConditions.push({ metadata: { path: '$.recipientUserId', equals: callerUserId } });
      employeeOrConditions.push({ metadata: { path: '$.recipientEmployeeId', equals: callerUserId } });
    }

    if (email) {
      employeeOrConditions.push({ recipientId: email });
      employeeOrConditions.push({ metadata: { path: '$.email', equals: email } });
      employeeOrConditions.push({ metadata: { path: '$.recipientEmail', equals: email } });
    }

    return { OR: employeeOrConditions };
  }

  async getDismissedIds(userId?: string): Promise<string[]> {
    if (!userId) return [];
    try {
      const dismissals = await this.prisma.notificationDismissal.findMany({
        where: { userId },
        select: { notificationId: true },
      });
      return dismissals.map((d) => d.notificationId);
    } catch {
      return [];
    }
  }

  async findAll(query: QueryNotificationsDto, callerUserId?: string) {
    const { recipientId, email, role, isRead, page, limit } = query;
    const isPaginated = typeof page === 'number' && typeof limit === 'number' && page > 0 && limit > 0;
    const skip = isPaginated ? (page - 1) * limit : undefined;
    const take = isPaginated ? limit : undefined;

    const baseWhere = this.buildRecipientWhere(recipientId, email, role, callerUserId);
    const effectiveUserId = callerUserId || recipientId;
    const dismissedIds = await this.getDismissedIds(effectiveUserId);

    const where: any = { ...baseWhere };
    if (dismissedIds.length > 0) {
      where.id = { notIn: dismissedIds };
    }
    if (typeof isRead === 'boolean') {
      where.isRead = isRead;
    }

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...(isPaginated ? { skip, take } : {}),
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: {
          ...where,
          isRead: false,
        },
      }),
    ]);

    const enrichedItems = items.map((item) => {
      const meta = (item.metadata ? { ...(item.metadata as Record<string, any>) } : {}) as Record<string, any>;

      // Determine clean human-readable audience and name
      let recipientDisplay = 'All Staff';
      let recipientName = 'All Staff';
      let to = 'All Staff';

      if (meta.to) {
        to = String(meta.to);
        recipientDisplay = to;
        recipientName = to;
      } else if (item.recipientType === 'BROADCAST' || item.recipientId === 'ALL') {
        recipientDisplay = 'All Staff';
        recipientName = 'All Staff';
        to = 'All Staff';
      } else if (item.recipientType === 'HR' || item.recipientId === 'HR') {
        recipientDisplay = 'Human Resources';
        recipientName = 'Human Resources Team';
        to = 'Human Resources';
      } else if (item.recipientType === 'ADMIN' || item.recipientId === 'ADMIN') {
        recipientDisplay = 'Administrators';
        recipientName = 'System Administrators';
        to = 'Administrators';
      } else {
        // Individual person: Prominently use the person's actual Name!
        if (meta.recipientName || meta.name) {
          recipientName = meta.recipientName || meta.name;
          to = meta.employeeCode ? `${recipientName} (${meta.employeeCode})` : recipientName;
          recipientDisplay = recipientName;
        } else if (meta.employeeCode) {
          recipientName = meta.employeeCode;
          to = meta.employeeCode;
          recipientDisplay = meta.employeeCode;
        } else if (meta.email) {
          recipientName = meta.email;
          to = meta.email;
          recipientDisplay = meta.email;
        } else {
          recipientName = item.recipientId.startsWith('EMP-') ? item.recipientId : 'Staff Member';
          to = recipientName;
          recipientDisplay = recipientName;
        }
      }

      let from = meta.from || meta.senderName;
      if (!from) {
        if (item.type === 'SPECIAL_WORKING_HOURS_REQUEST') {
          from = meta.employeeName ? `${meta.employeeName} (Employee)` : 'Employee';
        } else if (item.type === 'SPECIAL_CONDITION_APPROVED' || item.type === 'SPECIAL_CONDITION_REJECTED') {
          from = meta.approvedByName || meta.approvedBy || 'HR Management';
        } else {
          from = 'HR Management';
        }
      }

      // Clean up sensitive internal DB keys from metadata so they are NOT exposed in DevTools inspect
      delete meta.userId;
      delete meta.recipientId;
      delete meta.recipientUserId;
      delete meta.recipientEmployeeId;
      delete meta.employeeId;
      delete meta.senderUserId;
      delete meta.senderEmail;
      delete meta.sessionId;

      if (meta.exceptionId && typeof meta.exceptionId === 'string' && meta.exceptionId.length === 36 && meta.exceptionId.includes('-')) {
        meta.exceptionId = `EXC-${meta.exceptionId.slice(-6).toUpperCase()}`;
      }

      // Clean up top-level recipientId so raw 36-char internal UUID is never exposed
      const cleanRecipientId =
        item.recipientId.length === 36 && item.recipientId.includes('-')
          ? meta.employeeCode || item.recipientType || 'STAFF'
          : item.recipientId;

      return {
        ...item,
        recipientId: cleanRecipientId,
        recipientDisplay,
        recipientName,
        from,
        to,
        metadata: meta,
      };
    });

    return {
      items: enrichedItems,
      total,
      unreadCount,
      page: page ?? 1,
      limit: limit ?? total,
      totalPages: isPaginated ? Math.ceil(total / limit) : 1,
    };
  }

  async getUnreadCount(recipientId?: string, email?: string, role?: string, callerUserId?: string) {
    const effectiveUserId = callerUserId || recipientId;
    const dismissedIds = await this.getDismissedIds(effectiveUserId);
    const where: any = {
      ...this.buildRecipientWhere(recipientId, email, role, effectiveUserId),
      isRead: false,
    };
    if (dismissedIds.length > 0) {
      where.id = { notIn: dismissedIds };
    }
    const count = await this.prisma.notification.count({ where });
    return { count };
  }

  async markAsRead(id: string) {
    const existing = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(recipientId?: string, email?: string, role?: string) {
    const baseWhere = this.buildRecipientWhere(recipientId, email, role);
    const result = await this.prisma.notification.updateMany({
      where: {
        ...baseWhere,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { updated: result.count };
  }

  async remove(id: string, userId?: string, hardDelete: boolean = false) {
    const existing = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    const isGroupOrBroadcast =
      existing.recipientId === 'ALL' ||
      existing.recipientId === 'HR' ||
      existing.recipientId === 'ADMIN' ||
      existing.recipientType === 'BROADCAST' ||
      existing.recipientType === 'HR' ||
      existing.recipientType === 'ADMIN';

    // 1. Explicit hardDelete requested (e.g. system administrator permanent purge)
    if (hardDelete) {
      await this.prisma.notification.delete({ where: { id } });
      return { success: true, mode: 'deleted' };
    }

    // 2. Normal inbox deletion: Per-User Dismissal
    // Records dismissal so the notification disappears from THIS user's feed,
    // but remains intact for all other employees, HR staff, and admins.
    if (userId) {
      await this.prisma.notificationDismissal.upsert({
        where: {
          notificationId_userId: { notificationId: id, userId },
        },
        create: { notificationId: id, userId },
        update: {},
      });
      return { success: true, mode: 'dismissed' };
    }

    // 3. Safety Guard: Never delete a group or broadcast notification without hardDelete
    if (isGroupOrBroadcast) {
      return { success: true, mode: 'dismissed' };
    }

    // Direct personal notification can be safely deleted
    await this.prisma.notification.delete({ where: { id } });
    return { success: true, mode: 'deleted' };
  }
}
