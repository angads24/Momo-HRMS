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
exports.ApproveExceptionDto = exports.ApproveStatus = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var ApproveStatus;
(function (ApproveStatus) {
    ApproveStatus["APPROVED"] = "APPROVED";
    ApproveStatus["REJECTED"] = "REJECTED";
})(ApproveStatus || (exports.ApproveStatus = ApproveStatus = {}));
class ApproveExceptionDto {
}
exports.ApproveExceptionDto = ApproveExceptionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ApproveStatus, example: ApproveStatus.APPROVED }),
    (0, class_validator_1.IsEnum)(ApproveStatus),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ApproveExceptionDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Optional HR comment or note', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ApproveExceptionDto.prototype, "comment", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Optional HR approver name', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ApproveExceptionDto.prototype, "approverName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Optional HR approver email', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ApproveExceptionDto.prototype, "approverEmail", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Optional employee ID for fallback recreation', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ApproveExceptionDto.prototype, "employeeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Optional attendance date (YYYY-MM-DD) for fallback recreation', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ApproveExceptionDto.prototype, "attendanceDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Optional additional hours for fallback recreation', required: false }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], ApproveExceptionDto.prototype, "additionalHours", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Optional reason for fallback recreation', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ApproveExceptionDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Optional metadata dictionary', required: false }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], ApproveExceptionDto.prototype, "metadata", void 0);
//# sourceMappingURL=approve-exception.dto.js.map