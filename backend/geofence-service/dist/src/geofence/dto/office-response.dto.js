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
exports.VerifyLocationResponseDto = exports.OfficeResponseDto = exports.PolygonResponseDto = exports.VertexResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class VertexResponseDto {
}
exports.VertexResponseDto = VertexResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], VertexResponseDto.prototype, "sequence", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], VertexResponseDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], VertexResponseDto.prototype, "longitude", void 0);
class PolygonResponseDto {
}
exports.PolygonResponseDto = PolygonResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PolygonResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PolygonResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PolygonResponseDto.prototype, "version", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], PolygonResponseDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [VertexResponseDto] }),
    __metadata("design:type", Array)
], PolygonResponseDto.prototype, "vertices", void 0);
class OfficeResponseDto {
}
exports.OfficeResponseDto = OfficeResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OfficeResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OfficeResponseDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OfficeResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Object)
], OfficeResponseDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Object)
], OfficeResponseDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Object)
], OfficeResponseDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], OfficeResponseDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, type: PolygonResponseDto }),
    __metadata("design:type", Object)
], OfficeResponseDto.prototype, "activePolygon", void 0);
class VerifyLocationResponseDto {
}
exports.VerifyLocationResponseDto = VerifyLocationResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether the coordinates are inside the office polygon' }),
    __metadata("design:type", Boolean)
], VerifyLocationResponseDto.prototype, "isInside", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Target office identifier' }),
    __metadata("design:type", String)
], VerifyLocationResponseDto.prototype, "officeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Office name' }),
    __metadata("design:type", String)
], VerifyLocationResponseDto.prototype, "officeName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Distance in meters to the nearest polygon edge' }),
    __metadata("design:type", Number)
], VerifyLocationResponseDto.prototype, "distanceToBoundaryMeters", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether altitude check passed (if altitude bounds configured)' }),
    __metadata("design:type", Boolean)
], VerifyLocationResponseDto.prototype, "altitudeValid", void 0);
//# sourceMappingURL=office-response.dto.js.map