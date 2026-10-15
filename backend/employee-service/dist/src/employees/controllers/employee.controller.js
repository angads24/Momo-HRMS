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
exports.EmployeeController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const employee_service_1 = require("../services/employee.service");
const create_employee_dto_1 = require("../dto/create-employee.dto");
const update_employee_dto_1 = require("../dto/update-employee.dto");
const assign_office_dto_1 = require("../dto/assign-office.dto");
const employee_query_dto_1 = require("../dto/employee-query.dto");
const api_message_decorator_1 = require("../../common/decorators/api-message.decorator");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const app_exception_1 = require("../../common/exceptions/app.exception");
const error_codes_1 = require("../../common/constants/error-codes");
function extractUserFromRequest(req) {
    let userId = req.headers['x-user-id'] || undefined;
    let employeeId = req.headers['x-employee-id'] || undefined;
    let email = req.headers['x-email'] || undefined;
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.slice(7).trim();
            const parts = token.split('.');
            if (parts.length === 3) {
                const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
                const payload = JSON.parse(payloadJson);
                if (payload.sub && !userId)
                    userId = payload.sub;
                if (payload.email && !email)
                    email = payload.email;
                if (payload.employeeId && !employeeId)
                    employeeId = payload.employeeId;
            }
        }
        catch {
        }
    }
    return { userId, email, employeeId };
}
let EmployeeController = class EmployeeController {
    constructor(employeeService) {
        this.employeeService = employeeService;
    }
    async createEmployee(dto) {
        return this.employeeService.createEmployee(dto);
    }
    async listEmployees(query) {
        return this.employeeService.listEmployees(query);
    }
    async getMetrics() {
        return this.employeeService.getDashboardMetrics();
    }
    async getHrStaff() {
        return this.employeeService.getHrStaff();
    }
    async getMe(req) {
        const { userId, email, employeeId } = extractUserFromRequest(req);
        return this.employeeService.getEmployeeMe(userId, email, employeeId);
    }
    async updateMe(req, dto) {
        const { userId, email, employeeId } = extractUserFromRequest(req);
        return this.employeeService.updateEmployeeMe(userId, email, employeeId, dto);
    }
    async updatePhoto(req, body) {
        const { userId, email, employeeId } = extractUserFromRequest(req);
        return this.employeeService.updateEmployeeMe(userId, email, employeeId, {
            profilePhotoUrl: body.photo,
        });
    }
    async getAttendanceToken(req, body) {
        const { userId, email, employeeId } = extractUserFromRequest(req);
        const employee = await this.employeeService.getEmployeeMe(userId, email, employeeId);
        if (body?.photo) {
            try {
                await fetch('http://localhost:3006/api/v1/face/enroll', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        employee_id: employee.employeeCode,
                        image_base64: body.photo.replace(/^data:image\/\w+;base64,/, ''),
                    }),
                });
            }
            catch {
            }
        }
        const token = this.employeeService.generateAttendanceToken(employee.employeeCode);
        return { success: true, token, employeeCode: employee.employeeCode };
    }
    async resolveIdentifier(identifier) {
        return this.employeeService.resolveIdentifier(identifier || '');
    }
    async downloadTemplate(res) {
        const csvContent = this.employeeService.getImportTemplateCsv();
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="employee_import_template.csv"');
        return res.status(common_1.HttpStatus.OK).send(csvContent);
    }
    async validateImport(file) {
        if (!file || !file.buffer) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.VALIDATION_FAILED, 'CSV file is required', common_1.HttpStatus.BAD_REQUEST);
        }
        return this.employeeService.validateImportFile(file.buffer);
    }
    async executeImport(file, provisionAccounts) {
        if (!file || !file.buffer) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.VALIDATION_FAILED, 'CSV file is required', common_1.HttpStatus.BAD_REQUEST);
        }
        const shouldProvision = provisionAccounts !== 'false';
        return this.employeeService.executeImportFile(file.buffer, shouldProvision);
    }
    async getEmployeeProfile(id) {
        return this.employeeService.getEmployeeProfile(id);
    }
    async getEmployeeById(id) {
        return this.employeeService.getEmployeeById(id);
    }
    async getEmployeeByUserId(userId) {
        return this.employeeService.getEmployeeByUserId(userId);
    }
    async updateEmployeePut(id, dto) {
        return this.employeeService.updateEmployee(id, dto);
    }
    async updateEmployee(id, dto) {
        return this.employeeService.updateEmployee(id, dto);
    }
    async updateStatus(id, body) {
        return this.employeeService.updateEmployeeStatus(id, body.status);
    }
    async updateRole(id, body) {
        return this.employeeService.getEmployeeById(id);
    }
    async deleteEmployee(id) {
        return this.employeeService.deleteEmployee(id);
    }
    async assignOffice(id, dto) {
        return this.employeeService.assignOffice(id, dto);
    }
    async removeOfficeAssignment(assignmentId) {
        return this.employeeService.removeOfficeAssignment(assignmentId);
    }
    async checkOfficeAssignment(id, officeId) {
        const isAssigned = await this.employeeService.isAssignedToOffice(id, officeId);
        return { isAssigned, employeeId: id, officeId };
    }
    async resendCredentials(id) {
        return this.employeeService.resendCredentials(id);
    }
    async testSmtpPost(body) {
        return this.employeeService.testSmtp(body?.toEmail);
    }
    async testSmtpGet(toEmail) {
        return this.employeeService.testSmtp(toEmail);
    }
    async registerDevice(id, body) {
        return {
            id: 'device-' + Date.now(),
            employeeId: id,
            deviceName: body.deviceName || 'Personal Mobile',
            deviceType: body.deviceType || 'ANDROID',
            deviceIdentifier: body.deviceIdentifier || 'dev-id-001',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
        };
    }
};
exports.EmployeeController = EmployeeController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Register a new employee profile' }),
    (0, api_message_decorator_1.ApiMessage)('Employee created successfully'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_employee_dto_1.CreateEmployeeDto]),
    __metadata("design:returntype", Promise)
], EmployeeController.prototype, "createEmployee", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List employees with pagination and filters' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [employee_query_dto_1.EmployeeQueryDto]),
    __metadata("design:returntype", Promise)
], EmployeeController.prototype, "listEmployees", null);
__decorate([
    (0, common_1.Get)('metrics'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get workforce and department count metrics' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EmployeeController.prototype, "getMetrics", null);
__decorate([
    (0, common_1.Get)('hr-staff'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'List HR staff members for employee contact and requests' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EmployeeController.prototype, "getHrStaff", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get current authenticated employee profile' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmployeeController.prototype, "getMe", null);
__decorate([
    (0, common_1.Put)('me'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update current authenticated employee profile' }),
    (0, api_message_decorator_1.ApiMessage)('Employee profile updated successfully'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_employee_dto_1.UpdateEmployeeDto]),
    __metadata("design:returntype", Promise)
], EmployeeController.prototype, "updateMe", null);
__decorate([
    (0, common_1.Post)('me/photo'),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Update current authenticated employee profile photo' }),
    (0, api_message_decorator_1.ApiMessage)('Profile photo updated successfully'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EmployeeController.prototype, "updatePhoto", null);
__decorate([
    (0, common_1.Post)('me/attendance-token'),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Generate biometric verification token for attendance check-in' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EmployeeController.prototype, "getAttendanceToken", null);
__decorate([
    (0, common_1.Get)('resolve-identifier'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Resolve employee official login credentials by personal email, official email, or employee code' }),
    __param(0, (0, common_1.Query)('identifier')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmployeeController.prototype, "resolveIdentifier", null);
__decorate([
    (0, common_1.Get)('import/template'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Download employee bulk import CSV template' }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmployeeController.prototype, "downloadTemplate", null);
__decorate([
    (0, common_1.Post)('import/validate'),
    (0, public_decorator_1.Public)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiOperation)({ summary: 'Validate CSV file for bulk employee import' }),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmployeeController.prototype, "validateImport", null);
__decorate([
    (0, common_1.Post)('import'),
    (0, public_decorator_1.Public)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiOperation)({ summary: 'Execute bulk employee import from CSV' }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('provisionAccounts')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], EmployeeController.prototype, "executeImport", null);
__decorate([
    (0, common_1.Get)(':id/profile'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get comprehensive employee profile including devices and face template status' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmployeeController.prototype, "getEmployeeProfile", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get employee details by ID or Employee Code' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmployeeController.prototype, "getEmployeeById", null);
__decorate([
    (0, common_1.Get)('by-user/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get employee profile linked to an Auth User UUID' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmployeeController.prototype, "getEmployeeByUserId", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update employee profile (PUT)' }),
    (0, api_message_decorator_1.ApiMessage)('Employee updated successfully'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_employee_dto_1.UpdateEmployeeDto]),
    __metadata("design:returntype", Promise)
], EmployeeController.prototype, "updateEmployeePut", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update employee profile (PATCH)' }),
    (0, api_message_decorator_1.ApiMessage)('Employee updated successfully'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_employee_dto_1.UpdateEmployeeDto]),
    __metadata("design:returntype", Promise)
], EmployeeController.prototype, "updateEmployee", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Update employee employment status' }),
    (0, api_message_decorator_1.ApiMessage)('Employee status updated successfully'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EmployeeController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Patch)(':id/role'),
    (0, swagger_1.ApiOperation)({ summary: 'Update employee role' }),
    (0, api_message_decorator_1.ApiMessage)('Employee role updated successfully'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EmployeeController.prototype, "updateRole", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Permanently delete an employee record (Admin only)' }),
    (0, api_message_decorator_1.ApiMessage)('Employee deleted successfully'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmployeeController.prototype, "deleteEmployee", null);
__decorate([
    (0, common_1.Post)(':id/offices'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Assign employee to an office workplace' }),
    (0, api_message_decorator_1.ApiMessage)('Office assignment created'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assign_office_dto_1.AssignOfficeDto]),
    __metadata("design:returntype", Promise)
], EmployeeController.prototype, "assignOffice", null);
__decorate([
    (0, common_1.Delete)('offices/:assignmentId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Deactivate an office assignment' }),
    (0, api_message_decorator_1.ApiMessage)('Office assignment deactivated'),
    __param(0, (0, common_1.Param)('assignmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmployeeController.prototype, "removeOfficeAssignment", null);
__decorate([
    (0, common_1.Get)(':id/assignment-check'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Check if an employee is currently assigned to a given office' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('officeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EmployeeController.prototype, "checkOfficeAssignment", null);
__decorate([
    (0, common_1.Post)(':id/resend-credentials'),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Resend credentials to employee via SMTP' }),
    (0, api_message_decorator_1.ApiMessage)('Credentials resent successfully'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmployeeController.prototype, "resendCredentials", null);
__decorate([
    (0, common_1.Post)('smtp/test'),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Test SMTP email delivery' }),
    (0, api_message_decorator_1.ApiMessage)('SMTP test email initiated'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmployeeController.prototype, "testSmtpPost", null);
__decorate([
    (0, common_1.Get)('smtp/test'),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Test SMTP email delivery (GET shortcut)' }),
    (0, api_message_decorator_1.ApiMessage)('SMTP test email initiated'),
    __param(0, (0, common_1.Query)('toEmail')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmployeeController.prototype, "testSmtpGet", null);
__decorate([
    (0, common_1.Post)(':id/devices'),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Register a device for an employee' }),
    (0, api_message_decorator_1.ApiMessage)('Device registered successfully'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EmployeeController.prototype, "registerDevice", null);
exports.EmployeeController = EmployeeController = __decorate([
    (0, swagger_1.ApiTags)('employees'),
    (0, common_1.Controller)('employees'),
    __metadata("design:paramtypes", [employee_service_1.EmployeeService])
], EmployeeController);
//# sourceMappingURL=employee.controller.js.map