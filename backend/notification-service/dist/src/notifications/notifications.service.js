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
            (email && (email.toLowerCase().includes('hr') || email.toLowerCase().includes('admin')));
        const orConditions = [
            { recipientId: 'ALL' },
            { recipientType: 'BROADCAST' },
        ];
        if (recipientId && recipientId !== 'ALL') {
            orConditions.push({ recipientId });
        }
        if (email) {
            orConditions.push({ recipientId: email });
        }
        if (isManagement) {
            orConditions.push({ recipientType: 'HR' });
            orConditions.push({ recipientId: 'HR' });
            orConditions.push({ type: 'SPECIAL_WORKING_HOURS_REQUEST' });
        }
        return { OR: orConditions };
    }
    async findAll(query) {
        const { recipientId, email, role, isRead, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;
        const baseWhere = this.buildRecipientWhere(recipientId, email, role);
        const where = { ...baseWhere };
        if (typeof isRead === 'boolean') {
            where.isRead = isRead;
        }
        const [items, total, unreadCount] = await Promise.all([
            this.prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.notification.count({ where }),
            this.prisma.notification.count({
                where: {
                    ...baseWhere,
                    isRead: false,
                },
            }),
        ]);
        return {
            items,
            total,
            unreadCount,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getUnreadCount(recipientId, email, role) {
        const where = {
            ...this.buildRecipientWhere(recipientId, email, role),
            isRead: false,
        };
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
    async remove(id) {
        const existing = await this.prisma.notification.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Notification with ID ${id} not found`);
        }
        await this.prisma.notification.delete({
            where: { id },
        });
        return { success: true };
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