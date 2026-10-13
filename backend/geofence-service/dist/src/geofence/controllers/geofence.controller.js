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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeofenceController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const geofence_service_1 = require("../services/geofence.service");
const verify_location_dto_1 = require("../dto/verify-location.dto");
const office_response_dto_1 = require("../dto/office-response.dto");
const api_message_decorator_1 = require("../../common/decorators/api-message.decorator");
const public_decorator_1 = require("../../common/decorators/public.decorator");
let GeofenceController = class GeofenceController {
    constructor(geofenceService) {
        this.geofenceService = geofenceService;
    }
    async verify(dto) {
        return this.geofenceService.verifyLocation(dto);
    }
    async deletePolygonById(id) {
        return this.geofenceService.deletePolygonById(id);
    }
    async deleteGeofenceByOfficeId(officeId) {
        return this.geofenceService.deleteOfficePolygon(officeId, true);
    }
};
exports.GeofenceController = GeofenceController;
__decorate([
    (0, common_1.Post)('verify'),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Verify if a location coordinate is inside an office geofence polygon' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: office_response_dto_1.VerifyLocationResponseDto }),
    (0, api_message_decorator_1.ApiMessage)('Location verification completed'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_location_dto_1.VerifyLocationDto]),
    __metadata("design:returntype", Promise)
], GeofenceController.prototype, "verify", null);
__decorate([
    (0, common_1.Delete)('polygons/:id'),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a specific geofence polygon by ID' }),
    (0, api_message_decorator_1.ApiMessage)('Geofence polygon deleted successfully'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GeofenceController.prototype, "deletePolygonById", null);
__decorate([
    (0, common_1.Delete)(':officeId'),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Delete geofence polygon for an office' }),
    (0, api_message_decorator_1.ApiMessage)('Geofence deleted successfully'),
    __param(0, (0, common_1.Param)('officeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GeofenceController.prototype, "deleteGeofenceByOfficeId", null);
exports.GeofenceController = GeofenceController = __decorate([
    (0, swagger_1.ApiTags)('geofence'),
    (0, common_1.Controller)('geofence'),
    __metadata("design:paramtypes", [geofence_service_1.GeofenceService])
], GeofenceController);
//# sourceMappingURL=geofence.controller.js.map