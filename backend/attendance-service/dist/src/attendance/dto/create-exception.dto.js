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
exports.CreateExceptionDto = exports.ExceptionType = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var ExceptionType;
(function (ExceptionType) {
    ExceptionType["RECHECK_IN"] = "RECHECK_IN";
    ExceptionType["EXTRA_GRACE"] = "EXTRA_GRACE";
    ExceptionType["OFFICE_TRANSFER"] = "OFFICE_TRANSFER";
    ExceptionType["WORKING_TIME_ADJUSTMENT"] = "WORKING_TIME_ADJUSTMENT";
})(ExceptionType || (exports.ExceptionType = ExceptionType = {}));
class CreateExceptionDto {
}
exports.CreateExceptionDto = CreateExceptionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Employee ID for whom exception is requested', example: 'EMP-001' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateExceptionDto.prototype, "employeeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Date of attendance (YYYY-MM-DD)', example: '2026-09-25' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateExceptionDto.prototype, "attendanceDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ExceptionType, example: ExceptionType.RECHECK_IN }),
    (0, class_validator_1.IsEnum)(ExceptionType),
    __metadata("design:type", String)
], CreateExceptionDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Reason for exception request', example: 'Site visit concluded, returned to office' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateExceptionDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Specific session ID if applicable' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateExceptionDto.prototype, "attendanceSessionId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Additional working hours requested (e.g. 2)', example: 2 }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateExceptionDto.prototype, "additionalHours", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Additional working minutes requested (e.g. 120)', example: 120 }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateExceptionDto.prototype, "additionalMinutes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Target HR Email' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateExceptionDto.prototype, "hrEmail", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Additional metadata JSON' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateExceptionDto.prototype, "metadata", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Valid from timestamp (ISO-8601)', example: '2026-09-25T13:00:00.000Z' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateExceptionDto.prototype, "validFrom", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Valid until timestamp (ISO-8601)', example: '2026-09-25T18:00:00.000Z' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateExceptionDto.prototype, "validUntil", void 0);
//# sourceMappingURL=create-exception.dto.js.map