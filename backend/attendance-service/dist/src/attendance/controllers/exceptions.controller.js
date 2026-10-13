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
exports.ExceptionsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const exceptions_service_1 = require("../services/exceptions.service");
const create_exception_dto_1 = require("../dto/create-exception.dto");
const approve_exception_dto_1 = require("../dto/approve-exception.dto");
const api_message_decorator_1 = require("../../common/decorators/api-message.decorator");
const current_employee_decorator_1 = require("../../common/decorators/current-employee.decorator");
const client_1 = require("@prisma/client");
let ExceptionsController = class ExceptionsController {
    constructor(exceptionsService) {
        this.exceptionsService = exceptionsService;
    }
    async createException(dto) {
        return this.exceptionsService.createException(dto);
    }
    async approveException(auth, id, dto) {
        const approverUserId = auth?.userId || auth?.employeeId || 'HR_ADMIN';
        return this.exceptionsService.approveException(id, approverUserId, dto);
    }
    async deleteException(id) {
        return this.exceptionsService.cancelException(id);
    }
    async getExceptionById(id) {
        return this.exceptionsService.getExceptionById(id);
    }
    async listExceptions(employeeId, status, hrEmail) {
        const validStatus = status && Object.values(client_1.ExceptionStatus).includes(status.toUpperCase())
            ? status.toUpperCase()
            : undefined;
        return this.exceptionsService.getExceptions(employeeId, validStatus, hrEmail);
    }
};
exports.ExceptionsController = ExceptionsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, api_message_decorator_1.ApiMessage)('Attendance exception requested successfully'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_exception_dto_1.CreateExceptionDto]),
    __metadata("design:returntype", Promise)
], ExceptionsController.prototype, "createException", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, api_message_decorator_1.ApiMessage)('Attendance exception decision recorded'),
    __param(0, (0, current_employee_decorator_1.CurrentEmployee)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, approve_exception_dto_1.ApproveExceptionDto]),
    __metadata("design:returntype", Promise)
], ExceptionsController.prototype, "approveException", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, api_message_decorator_1.ApiMessage)('Attendance exception cancelled'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ExceptionsController.prototype, "deleteException", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ExceptionsController.prototype, "getExceptionById", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('employeeId')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('hrEmail')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ExceptionsController.prototype, "listExceptions", null);
exports.ExceptionsController = ExceptionsController = __decorate([
    (0, swagger_1.ApiTags)('attendance-exceptions'),
    (0, common_1.Controller)('attendance/exceptions'),
    __metadata("design:paramtypes", [exceptions_service_1.ExceptionsService])
], ExceptionsController);
//# sourceMappingURL=exceptions.controller.js.map