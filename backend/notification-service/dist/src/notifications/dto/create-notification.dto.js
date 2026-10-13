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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateNotificationDto = exports.NOTIFICATION_TYPES = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
exports.NOTIFICATION_TYPES = [
    'GEOFENCE_EXIT_WARNING',
    'GEOFENCE_RETURN',
    'CHECKIN_CONFIRMATION',
    'CHECKOUT_CONFIRMATION',
    'EXCEPTION_REQUESTED',
    'EXCEPTION_APPROVED',
    'EXCEPTION_REJECTED',
    'SPECIAL_WORKING_HOURS_REQUEST',
    'SPECIAL_CONDITION_APPROVED',
    'SPECIAL_CONDITION_REJECTED',
    'SYSTEM_ALERT',
];
class CreateNotificationDto {
}
exports.CreateNotificationDto = CreateNotificationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Target recipient (employee ID, user ID, or ALL)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateNotificationDto.prototype, "recipientId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Recipient classification (EMPLOYEE, USER, BROADCAST, HR)', default: 'EMPLOYEE' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['EMPLOYEE', 'USER', 'BROADCAST', 'HR']),
    __metadata("design:type", String)
], CreateNotificationDto.prototype, "recipientType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Notification type', enum: exports.NOTIFICATION_TYPES }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(exports.NOTIFICATION_TYPES),
    __metadata("design:type", String)
], CreateNotificationDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Notification title' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateNotificationDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Notification body text' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateNotificationDto.prototype, "body", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Arbitrary contextual payload (e.g. officeId, session, distance)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateNotificationDto.prototype, "metadata", void 0);
//# sourceMappingURL=create-notification.dto.js.map