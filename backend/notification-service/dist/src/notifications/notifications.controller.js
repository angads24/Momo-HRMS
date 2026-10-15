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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const rxjs_1 = require("rxjs");
const notifications_service_1 = require("./notifications.service");
const sse_service_1 = require("./sse.service");
const create_notification_dto_1 = require("./dto/create-notification.dto");
const query_notifications_dto_1 = require("./dto/query-notifications.dto");
let NotificationsController = class NotificationsController {
    constructor(notificationsService, sseService) {
        this.notificationsService = notificationsService;
        this.sseService = sseService;
    }
    async send(dto) {
        return this.notificationsService.create(dto);
    }
    async createNotification(dto) {
        return this.notificationsService.create(dto);
    }
    async findAll(query, req) {
        const headerUserId = req?.headers['x-user-id'];
        const headerEmpId = req?.headers['x-employee-id'];
        const headerRole = req?.headers['x-roles'];
        const headerEmail = req?.headers['x-email'];
        const effectiveRecipientId = query.recipientId || headerEmpId || headerUserId;
        const effectiveEmail = query.email || headerEmail;
        const effectiveRole = query.role || headerRole;
        return this.notificationsService.findAll({
            ...query,
            recipientId: effectiveRecipientId,
            email: effectiveEmail,
            role: effectiveRole,
        }, headerUserId || headerEmpId || query.recipientId);
    }
    async getUnreadCount(recipientId, email, role, req) {
        const headerUserId = req?.headers['x-user-id'];
        const headerEmpId = req?.headers['x-employee-id'];
        const headerRole = req?.headers['x-roles'];
        const headerEmail = req?.headers['x-email'];
        const effectiveRecipientId = recipientId || headerEmpId || headerUserId;
        const effectiveEmail = email || headerEmail;
        const effectiveRole = role || headerRole;
        const callerId = headerUserId || headerEmpId || recipientId;
        return this.notificationsService.getUnreadCount(effectiveRecipientId, effectiveEmail, effectiveRole, callerId);
    }
    stream(recipientId, email, req) {
        const headerUserId = req?.headers['x-user-id'];
        const headerEmpId = req?.headers['x-employee-id'];
        const headerEmail = req?.headers['x-email'];
        const effectiveId = recipientId || headerEmpId || headerUserId || 'ALL';
        const effectiveEmail = email || headerEmail;
        return this.sseService.getRecipientStream(effectiveId, effectiveEmail);
    }
    async markAsRead(id) {
        return this.notificationsService.markAsRead(id);
    }
    async markAllAsRead(recipientId, email, role, body, req) {
        const headerUserId = req?.headers['x-user-id'];
        const headerEmpId = req?.headers['x-employee-id'];
        const headerRole = req?.headers['x-roles'];
        const headerEmail = req?.headers['x-email'];
        const effectiveRecipientId = recipientId || body?.recipientId || headerEmpId || headerUserId;
        const effectiveEmail = email || body?.email || headerEmail;
        const effectiveRole = role || body?.role || headerRole;
        return this.notificationsService.markAllAsRead(effectiveRecipientId, effectiveEmail, effectiveRole);
    }
    async remove(id, hard, queryUserId, req) {
        const headerUserId = req?.headers['x-user-id'];
        const headerEmpId = req?.headers['x-employee-id'];
        const callerId = queryUserId || headerUserId || headerEmpId;
        const isHard = hard === 'true';
        return this.notificationsService.remove(id, callerId, isHard);
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Post)('send'),
    (0, swagger_1.ApiOperation)({ summary: 'Send an in-app notification (Internal / Service-to-Service)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Notification created and broadcasted via SSE' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_notification_dto_1.CreateNotificationDto]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "send", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create and dispatch an in-app notification' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Notification created and broadcasted via SSE' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_notification_dto_1.CreateNotificationDto]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "createNotification", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List notifications for a user/employee with pagination' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_notifications_dto_1.QueryNotificationsDto, Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('unread-count'),
    (0, swagger_1.ApiOperation)({ summary: 'Get unread notification count for a recipient' }),
    (0, swagger_1.ApiQuery)({ name: 'recipientId', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'email', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'role', required: false, type: String }),
    __param(0, (0, common_1.Query)('recipientId')),
    __param(1, (0, common_1.Query)('email')),
    __param(2, (0, common_1.Query)('role')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "getUnreadCount", null);
__decorate([
    (0, common_1.Sse)('stream'),
    (0, swagger_1.ApiOperation)({ summary: 'Real-time Server-Sent Events (SSE) notification stream for web and mobile' }),
    (0, swagger_1.ApiQuery)({ name: 'recipientId', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'email', required: false, type: String }),
    __param(0, (0, common_1.Query)('recipientId')),
    __param(1, (0, common_1.Query)('email')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", rxjs_1.Observable)
], NotificationsController.prototype, "stream", null);
__decorate([
    (0, common_1.Patch)(':id/read'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark a notification as read' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Post)('read-all'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark all notifications as read for a recipient' }),
    (0, swagger_1.ApiQuery)({ name: 'recipientId', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'email', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'role', required: false, type: String }),
    __param(0, (0, common_1.Query)('recipientId')),
    __param(1, (0, common_1.Query)('email')),
    __param(2, (0, common_1.Query)('role')),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "markAllAsRead", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete or dismiss a notification' }),
    (0, swagger_1.ApiQuery)({ name: 'hard', required: false, type: Boolean }),
    (0, swagger_1.ApiQuery)({ name: 'userId', required: false, type: String }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('hard')),
    __param(2, (0, common_1.Query)('userId')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "remove", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, swagger_1.ApiTags)('Notifications'),
    (0, common_1.Controller)('notifications'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true, whitelist: true })),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService,
        sse_service_1.SseService])
], NotificationsController);
//# sourceMappingURL=notifications.controller.js.map