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

    const sanitized = this.sanitizeNotification(notification);

    // Stream in real-time to active in-app connections
    this.sseService.emitNotification({
      recipientId: notification.recipientId,
      recipientType: notification.recipientType,
      notification: sanitized,
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
    return sanitized;
  }

  /**
   * Sanitizes notification records so internal raw database UUIDs (senderUserId,
   * recipientUserId, internal primary keys, session IDs) are never leaked in API responses,
   * while ensuring clean, functional recipient and sender fields for the UI.
   */
  private sanitizeNotification(item: any) {
    if (!item) return item;
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
        recipientName = item.recipientId && item.recipientId.startsWith('EMP-') ? item.recipientId : 'Staff Member';
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
        from = meta.senderRole === 'ADMIN' ? 'System Administrator' : 'HR Management';
      }
    }

    // Clean up sensitive internal DB keys/UUIDs from metadata so they are NOT exposed in DevTools inspect
    delete meta.userId;
    delete meta.recipientId;
    delete meta.recipientUserId;
    delete meta.recipientEmployeeId;
    delete meta.employeeId;
    delete meta.sessionId;
    delete meta.approvedByUserId;

    if (meta.senderUserId && typeof meta.senderUserId === 'string' && meta.senderUserId.length === 36 && meta.senderUserId.includes('-')) {
      delete meta.senderUserId;
    }

    if (meta.senderId && typeof meta.senderId === 'string' && (meta.senderId.length === 36 || meta.senderId.includes('-'))) {
      delete meta.senderId;
    }

    if (meta.exceptionId && typeof meta.exceptionId === 'string' && meta.exceptionId.length === 36 && meta.exceptionId.includes('-')) {
      meta.exceptionId = `EXC-${meta.exceptionId.slice(-6).toUpperCase()}`;
    }

    // Clean up top-level recipientId so raw 36-char internal UUID is never exposed
    const cleanRecipientId =
      item.recipientId && item.recipientId.length === 36 && item.recipientId.includes('-')
        ? meta.employeeCode || item.recipientType || 'STAFF'
        : item.recipientId;

    return {
      ...item,
      recipientId: cleanRecipientId,
      recipientDisplay,
      recipientName,
      from,
      to,
      senderEmail: meta.senderEmail || meta.email || '',
      senderRole: meta.senderRole || '',
      targetMode: meta.targetMode || '',
      recipientEmail: meta.recipientEmail || meta.email || '',
      metadata: meta,
    };
  }

  private buildRecipientWhere(recipientId?: string, email?: string, role?: string, callerUserId?: string): any {
    const rolesArray = (role || '')
      .split(',')
      .map((r) => r.trim().toUpperCase())
      .filter(Boolean);

    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanRecipientId = recipientId ? recipientId.trim().toUpperCase() : '';
    const cleanCallerUserId = callerUserId ? callerUserId.trim().toLowerCase() : '';

    const isAdmin =
      rolesArray.some((r) => ['ADMIN', 'SUPER_ADMIN'].includes(r)) ||
      cleanRecipientId === 'ADMIN' ||
      cleanEmail.includes('admin');

    const isHr =
      rolesArray.some((r) => ['HR', 'HR_ADMIN'].includes(r)) ||
      cleanRecipientId === 'HR' ||
      cleanEmail.includes('.hr@') ||
      cleanEmail.includes('hr@');

    const entryLeaveTypes = [
      'CHECKIN_CONFIRMATION',
      'CHECKOUT_CONFIRMATION',
      'GEOFENCE_EXIT_WARNING',
      'GEOFENCE_RETURN',
    ];

    const orConditions: any[] = [
      { recipientId: 'ALL' },
      { recipientType: 'BROADCAST' },
    ];

    if (isAdmin) {
      // Admin sees Admin announcements, notifications sent TO Admin, notifications SENT BY THIS Admin, and all special requests
      orConditions.push({ recipientId: 'ADMIN' });
      orConditions.push({ recipientType: 'ADMIN' });
      orConditions.push({ type: 'SPECIAL_WORKING_HOURS_REQUEST' });

      if (cleanEmail) {
        orConditions.push({ recipientId: cleanEmail });
        orConditions.push({ metadata: { path: '$.recipientEmail', equals: cleanEmail } });
        orConditions.push({ metadata: { path: '$.senderEmail', equals: cleanEmail } });
      }
      if (cleanCallerUserId) {
        orConditions.push({ metadata: { path: '$.senderUserId', equals: cleanCallerUserId } });
        orConditions.push({ metadata: { path: '$.recipientUserId', equals: cleanCallerUserId } });
      }

      return {
        AND: [
          { OR: orConditions },
          { type: { notIn: entryLeaveTypes } },
        ],
      };
    }

    if (isHr) {
      // HR sees HR announcements, notifications sent TO HR, notifications SENT BY THIS HR, and requests specifically assigned to them
      orConditions.push({ recipientId: 'HR' });
      orConditions.push({ recipientType: 'HR' });

      if (cleanRecipientId && cleanRecipientId !== 'HR') {
        orConditions.push({ recipientId: cleanRecipientId });
        orConditions.push({ metadata: { path: '$.employeeCode', equals: cleanRecipientId } });
        orConditions.push({ metadata: { path: '$.recipientId', equals: cleanRecipientId } });
        orConditions.push({ metadata: { path: '$.hrEmail', equals: cleanRecipientId.toLowerCase() } });
        orConditions.push({ metadata: { path: '$.senderUserId', equals: cleanRecipientId } });
      }
      if (cleanEmail) {
        orConditions.push({ recipientId: cleanEmail });
        orConditions.push({ metadata: { path: '$.recipientEmail', equals: cleanEmail } });
        orConditions.push({ metadata: { path: '$.hrEmail', equals: cleanEmail } });
        orConditions.push({ metadata: { path: '$.senderEmail', equals: cleanEmail } });
      }
      if (cleanCallerUserId) {
        orConditions.push({ metadata: { path: '$.senderUserId', equals: cleanCallerUserId } });
        orConditions.push({ metadata: { path: '$.recipientUserId', equals: cleanCallerUserId } });
      }

      return {
        AND: [
          { OR: orConditions },
          { type: { notIn: entryLeaveTypes } },
        ],
      };
    }

    // Direct Employee: sees personal communications, decisions, and messages sent by/to them
    if (recipientId && recipientId !== 'ALL' && recipientId !== 'HR' && recipientId !== 'ADMIN') {
      orConditions.push({ recipientId });
      orConditions.push({ metadata: { path: '$.employeeCode', equals: recipientId } });
      orConditions.push({ metadata: { path: '$.recipientId', equals: recipientId } });
    }

    if (cleanCallerUserId && cleanCallerUserId !== recipientId && cleanCallerUserId !== 'all') {
      orConditions.push({ recipientId: cleanCallerUserId });
      orConditions.push({ metadata: { path: '$.userId', equals: cleanCallerUserId } });
      orConditions.push({ metadata: { path: '$.recipientUserId', equals: cleanCallerUserId } });
      orConditions.push({ metadata: { path: '$.recipientEmployeeId', equals: cleanCallerUserId } });
      orConditions.push({ metadata: { path: '$.senderUserId', equals: cleanCallerUserId } });
    }

    if (cleanEmail) {
      orConditions.push({ recipientId: cleanEmail });
      orConditions.push({ metadata: { path: '$.email', equals: cleanEmail } });
      orConditions.push({ metadata: { path: '$.recipientEmail', equals: cleanEmail } });
      orConditions.push({ metadata: { path: '$.senderEmail', equals: cleanEmail } });
    }

    return { OR: orConditions };
  }

  async getDismissedIds(userIds?: string | string[]): Promise<string[]> {
    const list = (Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean) as string[];
    if (list.length === 0) return [];
    try {
      const dismissals = await this.prisma.notificationDismissal.findMany({
        where: { userId: { in: list } },
        select: { notificationId: true },
      });
      return dismissals.map((d) => d.notificationId);
    } catch {
      return [];
    }
  }

  async getReadIds(userIds?: string | string[]): Promise<Set<string>> {
    const list = (Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean) as string[];
    if (list.length === 0) return new Set();
    try {
      const reads = await this.prisma.notificationRead.findMany({
        where: { userId: { in: list } },
        select: { notificationId: true },
      });
      return new Set(reads.map((r) => r.notificationId));
    } catch {
      return new Set();
    }
  }

  async findAll(query: QueryNotificationsDto, callerUserIds?: string | string[]) {
    const { recipientId, email, role, isRead, page, limit } = query;
    const isPaginated = typeof page === 'number' && typeof limit === 'number' && page > 0 && limit > 0;
    const skip = isPaginated ? (page - 1) * limit : undefined;
    const take = isPaginated ? limit : undefined;

    const userList = (Array.isArray(callerUserIds) ? callerUserIds : [callerUserIds, recipientId, email]).filter(Boolean) as string[];
    const primaryUserId = userList[0] || recipientId;

    const baseWhere = this.buildRecipientWhere(recipientId, email, role, primaryUserId);
    const dismissedIds = await this.getDismissedIds(userList);
    const userReadIds = await this.getReadIds(userList);

    const where: any = { ...baseWhere };
    if (dismissedIds.length > 0) {
      where.id = { notIn: dismissedIds };
    }

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...(isPaginated ? { skip, take } : {}),
      }),
      this.prisma.notification.count({ where }),
    ]);

    const enrichedItems = items.map((item) => {
      const sanitized = this.sanitizeNotification(item);
      const isReadForUser = Boolean(sanitized.isRead || userReadIds.has(item.id));
      return {
        ...sanitized,
        isRead: isReadForUser,
      };
    });

    const finalFiltered = typeof isRead === 'boolean'
      ? enrichedItems.filter((i) => i.isRead === isRead)
      : enrichedItems;

    const unreadCount = enrichedItems.filter((i) => !i.isRead).length;

    return {
      items: finalFiltered,
      total: typeof isRead === 'boolean' ? finalFiltered.length : total,
      unreadCount,
      page: page ?? 1,
      limit: limit ?? total,
      totalPages: isPaginated ? Math.ceil(total / limit) : 1,
    };
  }

  async findOne(id: string) {
    const item = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!item) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    return this.sanitizeNotification(item);
  }

  async getUnreadCount(recipientId?: string, email?: string, role?: string, callerUserIds?: string | string[]) {
    const userList = (Array.isArray(callerUserIds) ? callerUserIds : [callerUserIds, recipientId, email]).filter(Boolean) as string[];
    const primaryUserId = userList[0] || recipientId;

    const dismissedIds = await this.getDismissedIds(userList);
    const userReadIds = await this.getReadIds(userList);

    const where: any = {
      ...this.buildRecipientWhere(recipientId, email, role, primaryUserId),
    };
    if (dismissedIds.length > 0) {
      where.id = { notIn: dismissedIds };
    }

    const candidates = await this.prisma.notification.findMany({
      where,
      select: { id: true, isRead: true },
    });

    const count = candidates.filter((c) => !c.isRead && !userReadIds.has(c.id)).length;
    return { count };
  }

  async markAsRead(id: string, userIds?: string | string[]) {
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

    const userList = (Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean) as string[];
    for (const uid of userList) {
      try {
        await this.prisma.notificationRead.upsert({
          where: {
            notificationId_userId: { notificationId: id, userId: uid },
          },
          create: { notificationId: id, userId: uid },
          update: { readAt: new Date() },
        });
      } catch (err: any) {
        this.logger.warn(`Failed to record per-user read in notificationRead for user ${uid}: ${err?.message || err}`);
      }
    }

    let updated = existing;
    if (!isGroupOrBroadcast) {
      updated = await this.prisma.notification.update({
        where: { id },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    }

    const sanitized = this.sanitizeNotification(updated);
    return {
      ...sanitized,
      isRead: true,
      readAt: new Date(),
    };
  }

  async markAllAsRead(recipientId?: string, email?: string, role?: string, callerUserIds?: string | string[]) {
    const userList = (Array.isArray(callerUserIds) ? callerUserIds : [callerUserIds, recipientId, email]).filter(Boolean) as string[];
    const primaryUserId = userList[0] || recipientId;

    const baseWhere = this.buildRecipientWhere(recipientId, email, role, primaryUserId);
    const dismissedIds = await this.getDismissedIds(userList);

    const where: any = { ...baseWhere };
    if (dismissedIds.length > 0) {
      where.id = { notIn: dismissedIds };
    }

    const unreadItems = await this.prisma.notification.findMany({
      where,
      select: { id: true, recipientId: true, recipientType: true, isRead: true },
    });

    const userReadIds = await this.getReadIds(userList);
    const toMark = unreadItems.filter((item) => !item.isRead && !userReadIds.has(item.id));

    let updatedCount = 0;

    for (const item of toMark) {
      const isGroupOrBroadcast =
        item.recipientId === 'ALL' ||
        item.recipientId === 'HR' ||
        item.recipientId === 'ADMIN' ||
        item.recipientType === 'BROADCAST' ||
        item.recipientType === 'HR' ||
        item.recipientType === 'ADMIN';

      for (const uid of userList) {
        try {
          await this.prisma.notificationRead.upsert({
            where: {
              notificationId_userId: { notificationId: item.id, userId: uid },
            },
            create: { notificationId: item.id, userId: uid },
            update: { readAt: new Date() },
          });
        } catch (err: any) {
          this.logger.warn(`Failed to record per-user read in notificationRead for user ${uid}: ${err?.message || err}`);
        }
      }

      if (!isGroupOrBroadcast) {
        await this.prisma.notification.update({
          where: { id: item.id },
          data: { isRead: true, readAt: new Date() },
        });
      }

      updatedCount++;
    }

    return { updated: updatedCount };
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
      try {
        await this.prisma.notificationDismissal.upsert({
          where: {
            notificationId_userId: { notificationId: id, userId },
          },
          create: { notificationId: id, userId },
          update: {},
        });
        return { success: true, mode: 'dismissed' };
      } catch (err: any) {
        this.logger.warn(`Failed to record per-user dismissal: ${err?.message || err}`);
        if (!isGroupOrBroadcast) {
          await this.prisma.notification.delete({ where: { id } });
          return { success: true, mode: 'deleted' };
        }
        return { success: true, mode: 'dismissed' };
      }
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
