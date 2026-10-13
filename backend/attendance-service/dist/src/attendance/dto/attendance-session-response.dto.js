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
exports.PaginatedHistoryResponseDto = exports.TodayAttendanceResponseDto = exports.SyncResponseDto = exports.SyncEventResultDto = exports.AttendanceSessionResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const enums_1 = require("../enums");
class AttendanceSessionResponseDto {
}
exports.AttendanceSessionResponseDto = AttendanceSessionResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AttendanceSessionResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AttendanceSessionResponseDto.prototype, "employeeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AttendanceSessionResponseDto.prototype, "officeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-09-22' }),
    __metadata("design:type", String)
], AttendanceSessionResponseDto.prototype, "attendanceDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: enums_1.AttendanceStatus }),
    __metadata("design:type", String)
], AttendanceSessionResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], AttendanceSessionResponseDto.prototype, "checkInAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ nullable: true }),
    __metadata("design:type", Object)
], AttendanceSessionResponseDto.prototype, "checkOutAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: enums_1.CheckInStatus }),
    __metadata("design:type", String)
], AttendanceSessionResponseDto.prototype, "checkInStatus", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ nullable: true }),
    __metadata("design:type", Object)
], AttendanceSessionResponseDto.prototype, "currentPauseStartedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ nullable: true }),
    __metadata("design:type", Object)
], AttendanceSessionResponseDto.prototype, "currentGraceDeadline", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: enums_1.CheckoutType, nullable: true }),
    __metadata("design:type", Object)
], AttendanceSessionResponseDto.prototype, "checkoutType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: enums_1.CheckoutReason, nullable: true }),
    __metadata("design:type", Object)
], AttendanceSessionResponseDto.prototype, "checkoutReason", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Live-computed, not just the stored column' }),
    __metadata("design:type", Number)
], AttendanceSessionResponseDto.prototype, "totalWorkingSeconds", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Live-computed total paused duration in seconds' }),
    __metadata("design:type", Number)
], AttendanceSessionResponseDto.prototype, "totalPausedSeconds", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Regular working seconds without special conditions', required: false }),
    __metadata("design:type", Number)
], AttendanceSessionResponseDto.prototype, "regularWorkingSeconds", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Approved special condition additional working seconds', required: false }),
    __metadata("design:type", Number)
], AttendanceSessionResponseDto.prototype, "specialConditionSeconds", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether special condition hours have been approved for this session/date', required: false }),
    __metadata("design:type", Boolean)
], AttendanceSessionResponseDto.prototype, "hasSpecialCondition", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Status of special condition (e.g. APPROVED)', required: false }),
    __metadata("design:type", String)
], AttendanceSessionResponseDto.prototype, "specialConditionStatus", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Reason for approved special condition', required: false }),
    __metadata("design:type", String)
], AttendanceSessionResponseDto.prototype, "specialConditionReason", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], AttendanceSessionResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], AttendanceSessionResponseDto.prototype, "updatedAt", void 0);
class SyncEventResultDto {
}
exports.SyncEventResultDto = SyncEventResultDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SyncEventResultDto.prototype, "clientEventId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'PROCESSED' }),
    __metadata("design:type", String)
], SyncEventResultDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], SyncEventResultDto.prototype, "message", void 0);
class SyncResponseDto {
}
exports.SyncResponseDto = SyncResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [SyncEventResultDto] }),
    __metadata("design:type", Array)
], SyncResponseDto.prototype, "results", void 0);
class TodayAttendanceResponseDto {
}
exports.TodayAttendanceResponseDto = TodayAttendanceResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-09-22' }),
    __metadata("design:type", String)
], TodayAttendanceResponseDto.prototype, "attendanceDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [AttendanceSessionResponseDto] }),
    __metadata("design:type", Array)
], TodayAttendanceResponseDto.prototype, "sessions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Sum of totalWorkingSeconds across all sessions today' }),
    __metadata("design:type", Number)
], TodayAttendanceResponseDto.prototype, "totalWorkingSecondsToday", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Regular working seconds today without special conditions', required: false }),
    __metadata("design:type", Number)
], TodayAttendanceResponseDto.prototype, "totalRegularWorkingSecondsToday", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Approved special condition seconds today', required: false }),
    __metadata("design:type", Number)
], TodayAttendanceResponseDto.prototype, "totalSpecialConditionSecondsToday", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether the employee has an active (WORKING/PAUSED) session right now' }),
    __metadata("design:type", Boolean)
], TodayAttendanceResponseDto.prototype, "hasActiveSession", void 0);
class PaginatedHistoryResponseDto {
}
exports.PaginatedHistoryResponseDto = PaginatedHistoryResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [AttendanceSessionResponseDto] }),
    __metadata("design:type", Array)
], PaginatedHistoryResponseDto.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PaginatedHistoryResponseDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PaginatedHistoryResponseDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PaginatedHistoryResponseDto.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PaginatedHistoryResponseDto.prototype, "totalPages", void 0);
//# sourceMappingURL=attendance-session-response.dto.js.map