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
exports.LocationDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class LocationDto {
}
exports.LocationDto = LocationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 18.5204, minimum: -90, maximum: 90 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-90),
    (0, class_validator_1.Max)(90),
    __metadata("design:type", Number)
], LocationDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 73.8567, minimum: -180, maximum: 180 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-180),
    (0, class_validator_1.Max)(180),
    __metadata("design:type", Number)
], LocationDto.prototype, "longitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, example: 560.2, description: 'Additional info only — never the primary geofence check (GPS altitude is unreliable)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], LocationDto.prototype, "altitudeMeters", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, example: 10, minimum: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], LocationDto.prototype, "accuracyMeters", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-09-22T09:32:10Z' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], LocationDto.prototype, "timestamp", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, example: false, description: 'True if GPS coordinates originated from a mock/spoofed provider on device' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], LocationDto.prototype, "isMocked", void 0);
//# sourceMappingURL=location.dto.js.map