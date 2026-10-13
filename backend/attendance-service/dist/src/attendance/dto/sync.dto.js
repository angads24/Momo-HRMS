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
exports.SyncDto = exports.SyncEventDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const enums_1 = require("../enums");
const location_dto_1 = require("./location.dto");
class SyncEventDto {
}
exports.SyncEventDto = SyncEventDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'uuid-1' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SyncEventDto.prototype, "clientEventId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: enums_1.AttendanceEventType }),
    (0, class_validator_1.IsEnum)(enums_1.AttendanceEventType),
    __metadata("design:type", String)
], SyncEventDto.prototype, "eventType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-09-22T09:30:00Z' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], SyncEventDto.prototype, "eventTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'OFFICE-001' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], SyncEventDto.prototype, "officeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: location_dto_1.LocationDto, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => location_dto_1.LocationDto),
    __metadata("design:type", location_dto_1.LocationDto)
], SyncEventDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'Offline stored face verification token' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SyncEventDto.prototype, "faceVerificationToken", void 0);
class SyncDto {
}
exports.SyncDto = SyncDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [SyncEventDto] }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => SyncEventDto),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ArrayMaxSize)(200),
    __metadata("design:type", Array)
], SyncDto.prototype, "events", void 0);
//# sourceMappingURL=sync.dto.js.map