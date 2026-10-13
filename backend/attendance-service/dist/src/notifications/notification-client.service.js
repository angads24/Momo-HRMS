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
var NotificationClientService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationClientService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let NotificationClientService = NotificationClientService_1 = class NotificationClientService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(NotificationClientService_1.name);
        this.notificationServiceUrl = this.configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:3005/api/v1');
    }
    async sendNotification(payload) {
        try {
            const response = await fetch(`${this.notificationServiceUrl}/notifications/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipientId: payload.recipientId,
                    recipientType: payload.recipientType || 'EMPLOYEE',
                    type: payload.type,
                    title: payload.title,
                    body: payload.body,
                    metadata: payload.metadata || {},
                }),
            });
            if (!response.ok) {
                this.logger.warn(`Notification service responded with status ${response.status} when notifying ${payload.recipientId}`);
            }
        }
        catch (error) {
            this.logger.warn(`Failed to send notification to ${payload.recipientId}: ${error.message}`);
        }
    }
};
exports.NotificationClientService = NotificationClientService;
exports.NotificationClientService = NotificationClientService = NotificationClientService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], NotificationClientService);
//# sourceMappingURL=notification-client.service.js.map