"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const sse_service_1 = require("./sse.service");
const email_service_1 = require("../email/email.service");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(prisma, sseService, emailService) {
        this.prisma = prisma;
        this.sseService = sseService;
        this.emailService = emailService;
        this.logger = new common_1.Logger(NotificationsService_1.name);
    }
    async create(dto) {
        const notification = await this.prisma.notification.create({
            data: {
                recipientId: dto.recipientId,
                recipientType: dto.recipientType || 'EMPLOYEE',
                type: dto.type,
                title: dto.title,
                body: dto.body,
                metadata: dto.metadata || {},
            },
        });
        this.sseService.emitNotification({
            recipientId: notification.recipientId,
            recipientType: notification.recipientType,
            notification,
        });
        try {
            if (dto.type === 'SPECIAL_WORKING_HOURS_REQUEST') {
                const meta = (dto.metadata || {});
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
            }
            else if (dto.type === 'SPECIAL_CONDITION_APPROVED' || dto.type === 'SPECIAL_CONDITION_REJECTED') {
                const meta = (dto.metadata || {});
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
        }
        catch (emailErr) {
            this.logger.warn(`Email delivery dispatch error: ${emailErr.message}`);
        }
        this.logger.log(`Created notification ${notification.id} for ${notification.recipientId} (${notification.type})`);
        return notification;
    }
    buildRecipientWhere(recipientId, email, role) {
        const isManagement = (role && ['HR', 'ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'].includes(role.toUpperCase())) ||
            recipientId === 'HR' ||
            recipientId === 'ADMIN' ||
            (email && (email.toLowerCase().includes('hr') || email.toLowerCase().includes('admin')));
        const isAdmin = (role && ['ADMIN', 'SUPER_ADMIN'].includes(role.toUpperCase())) ||
            recipientId === 'ADMIN' ||
            (email && email.toLowerCase().includes('admin'));
        if (isAdmin) {
            return {};
        }
        const orConditions = [
            { recipientId: 'ALL' },
            { recipientType: 'BROADCAST' },
        ];
        if (recipientId && recipientId !== 'ALL' && recipientId !== 'HR' && recipientId !== 'ADMIN') {
            orConditions.push({ recipientId });
            orConditions.push({ metadata: { path: '$.employeeCode', equals: recipientId } });
            orConditions.push({ metadata: { path: '$.userId', equals: recipientId } });
            orConditions.push({ metadata: { path: '$.recipientId', equals: recipientId } });
        }
        if (email) {
            orConditions.push({ recipientId: email });
            orConditions.push({ metadata: { path: '$.email', equals: email } });
        }
        if (isManagement) {
            orConditions.push({ recipientType: 'HR' });
            orConditions.push({ recipientId: 'HR' });
            orConditions.push({ type: 'SPECIAL_WORKING_HOURS_REQUEST' });
        }
        return { OR: orConditions };
    }
    async getDismissedIds(userId) {
        if (!userId)
            return [];
        try {
            const dismissals = await this.prisma.notificationDismissal.findMany({
                where: { userId },
                select: { notificationId: true },
            });
            return dismissals.map((d) => d.notificationId);
        }
        catch {
            return [];
        }
    }
    async findAll(query, callerUserId) {
        const { recipientId, email, role, isRead, page, limit } = query;
        const isPaginated = typeof page === 'number' && typeof limit === 'number' && page > 0 && limit > 0;
        const skip = isPaginated ? (page - 1) * limit : undefined;
        const take = isPaginated ? limit : undefined;
        const baseWhere = this.buildRecipientWhere(recipientId, email, role);
        const effectiveUserId = callerUserId || recipientId;
        const dismissedIds = await this.getDismissedIds(effectiveUserId);
        const where = { ...baseWhere };
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
            const meta = (item.metadata ? { ...item.metadata } : {});
            let recipientDisplay = 'All Staff';
            let recipientName = 'All Staff';
            let to = 'All Staff';
            if (item.recipientType === 'BROADCAST' || item.recipientId === 'ALL') {
                recipientDisplay = 'All Staff';
                recipientName = 'All Staff';
                to = 'All Staff';
            }
            else if (item.recipientType === 'HR' || item.recipientId === 'HR') {
                recipientDisplay = 'Human Resources';
                recipientName = 'Human Resources Team';
                to = 'Human Resources';
            }
            else if (item.recipientType === 'ADMIN' || item.recipientId === 'ADMIN') {
                recipientDisplay = 'Administrators';
                recipientName = 'System Administrators';
                to = 'Administrators';
            }
            else {
                if (meta.name) {
                    recipientName = meta.name;
                    to = meta.employeeCode ? `${meta.name} (${meta.employeeCode})` : meta.name;
                    recipientDisplay = meta.name;
                }
                else if (meta.employeeCode) {
                    recipientName = meta.employeeCode;
                    to = meta.employeeCode;
                    recipientDisplay = meta.employeeCode;
                }
                else if (meta.email) {
                    recipientName = meta.email;
                    to = meta.email;
                    recipientDisplay = meta.email;
                }
                else {
                    recipientName = item.recipientId.startsWith('EMP-') ? item.recipientId : 'Staff Member';
                    to = recipientName;
                    recipientDisplay = recipientName;
                }
            }
            const from = meta.senderName || 'System Administrator';
            delete meta.userId;
            delete meta.recipientId;
            delete meta.employeeId;
            const cleanRecipientId = item.recipientId.length === 36 && item.recipientId.includes('-')
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
    async getUnreadCount(recipientId, email, role, callerUserId) {
        const effectiveUserId = callerUserId || recipientId;
        const dismissedIds = await this.getDismissedIds(effectiveUserId);
        const where = {
            ...this.buildRecipientWhere(recipientId, email, role),
            isRead: false,
        };
        if (dismissedIds.length > 0) {
            where.id = { notIn: dismissedIds };
        }
        const count = await this.prisma.notification.count({ where });
        return { count };
    }
    async markAsRead(id) {
        const existing = await this.prisma.notification.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Notification with ID ${id} not found`);
        }
        return this.prisma.notification.update({
            where: { id },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
    }
    async markAllAsRead(recipientId, email, role) {
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
    async remove(id, userId, hardDelete = false) {
        const existing = await this.prisma.notification.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Notification with ID ${id} not found`);
        }
        const isGroupOrBroadcast = existing.recipientId === 'ALL' ||
            existing.recipientId === 'HR' ||
            existing.recipientId === 'ADMIN' ||
            existing.recipientType === 'BROADCAST' ||
            existing.recipientType === 'HR' ||
            existing.recipientType === 'ADMIN';
        if (hardDelete) {
            await this.prisma.notification.delete({ where: { id } });
            return { success: true, mode: 'deleted' };
        }
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
        if (isGroupOrBroadcast) {
            return { success: true, mode: 'dismissed' };
        }
        await this.prisma.notification.delete({ where: { id } });
        return { success: true, mode: 'deleted' };
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        sse_service_1.SseService,
        email_service_1.EmailService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map