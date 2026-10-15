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
exports.OfficeController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const geofence_service_1 = require("../services/geofence.service");
const create_office_dto_1 = require("../dto/create-office.dto");
const set_polygon_dto_1 = require("../dto/set-polygon.dto");
const office_response_dto_1 = require("../dto/office-response.dto");
const api_message_decorator_1 = require("../../common/decorators/api-message.decorator");
const public_decorator_1 = require("../../common/decorators/public.decorator");
let OfficeController = class OfficeController {
    constructor(geofenceService) {
        this.geofenceService = geofenceService;
    }
    async listOffices() {
        return this.geofenceService.listOffices();
    }
    async getOfficeCount() {
        const count = await this.geofenceService.countOffices();
        return { count };
    }
    async getOfficeById(id) {
        return this.geofenceService.getOfficeById(id);
    }
    async createOffice(dto) {
        return this.geofenceService.createOffice(dto);
    }
    async setPolygon(id, dto) {
        return this.geofenceService.setOfficePolygon(id, dto);
    }
    async deletePolygon(id, hard) {
        const isHard = hard === undefined || hard === 'true';
        return this.geofenceService.deleteOfficePolygon(id, isHard);
    }
    async deleteOffice(id, hard) {
        const isHard = hard === undefined || hard === 'true';
        return this.geofenceService.deleteOffice(id, isHard);
    }
};
exports.OfficeController = OfficeController;
__decorate([
    (0, common_1.Get)(),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all offices with their active geofence polygons' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [office_response_dto_1.OfficeResponseDto] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OfficeController.prototype, "listOffices", null);
__decorate([
    (0, common_1.Get)('count'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get total count of registered offices' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OfficeController.prototype, "getOfficeCount", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get single office details with active polygon' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: office_response_dto_1.OfficeResponseDto }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OfficeController.prototype, "getOfficeById", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new office (HR/Admin only)' }),
    (0, api_message_decorator_1.ApiMessage)('Office created successfully'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_office_dto_1.CreateOfficeDto]),
    __metadata("design:returntype", Promise)
], OfficeController.prototype, "createOffice", null);
__decorate([
    (0, common_1.Put)(':id/polygon'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Set or update office geofence polygon (HR/Admin only)' }),
    (0, api_message_decorator_1.ApiMessage)('Office geofence polygon updated successfully'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, set_polygon_dto_1.SetPolygonDto]),
    __metadata("design:returntype", Promise)
], OfficeController.prototype, "setPolygon", null);
__decorate([
    (0, common_1.Delete)(':id/polygon'),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Delete or remove geofence polygon for an office (HR/Admin only)' }),
    (0, api_message_decorator_1.ApiMessage)('Office geofence polygon deleted successfully'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('hard')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OfficeController.prototype, "deletePolygon", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Delete an office and all its geofence polygons (HR/Admin only)' }),
    (0, api_message_decorator_1.ApiMessage)('Office deleted successfully'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('hard')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OfficeController.prototype, "deleteOffice", null);
exports.OfficeController = OfficeController = __decorate([
    (0, swagger_1.ApiTags)('offices'),
    (0, common_1.Controller)('offices'),
    __metadata("design:paramtypes", [geofence_service_1.GeofenceService])
], OfficeController);
//# sourceMappingURL=office.controller.js.map