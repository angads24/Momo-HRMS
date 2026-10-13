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
exports.SetPolygonDto = exports.VertexDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class VertexDto {
}
exports.VertexDto = VertexDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], VertexDto.prototype, "sequence", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 18.5210 }),
    (0, class_validator_1.IsLatitude)(),
    __metadata("design:type", Number)
], VertexDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 73.8560 }),
    (0, class_validator_1.IsLongitude)(),
    __metadata("design:type", Number)
], VertexDto.prototype, "longitude", void 0);
class SetPolygonDto {
}
exports.SetPolygonDto = SetPolygonDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Name of the boundary version', example: 'Building B Perimeter' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SetPolygonDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Array of at least 3 polygon vertex points',
        type: [VertexDto],
        example: [
            { latitude: 18.5210, longitude: 73.8560 },
            { latitude: 18.5210, longitude: 73.8570 },
            { latitude: 18.5200, longitude: 73.8570 },
            { latitude: 18.5200, longitude: 73.8560 },
        ],
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(3),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => VertexDto),
    __metadata("design:type", Array)
], SetPolygonDto.prototype, "vertices", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Floor/building min altitude in meters' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SetPolygonDto.prototype, "minAltitudeMeters", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Floor/building max altitude in meters' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SetPolygonDto.prototype, "maxAltitudeMeters", void 0);
//# sourceMappingURL=set-polygon.dto.js.map