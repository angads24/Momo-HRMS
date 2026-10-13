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
exports.VerifyLocationDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class VerifyLocationDto {
}
exports.VerifyLocationDto = VerifyLocationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Office UUID or Code', example: 'OFFICE-001' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], VerifyLocationDto.prototype, "officeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Current latitude (-90 to 90)', example: 18.5204 }),
    (0, class_validator_1.IsLatitude)(),
    __metadata("design:type", Number)
], VerifyLocationDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Current longitude (-180 to 180)', example: 73.8567 }),
    (0, class_validator_1.IsLongitude)(),
    __metadata("design:type", Number)
], VerifyLocationDto.prototype, "longitude", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'GPS Altitude in meters', example: 560.2 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], VerifyLocationDto.prototype, "altitudeMeters", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'GPS accuracy in meters', example: 10 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], VerifyLocationDto.prototype, "accuracyMeters", void 0);
//# sourceMappingURL=verify-location.dto.js.map