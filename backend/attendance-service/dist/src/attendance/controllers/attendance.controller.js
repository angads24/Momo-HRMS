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
exports.AttendanceController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const attendance_service_1 = require("../services/attendance.service");
const check_in_dto_1 = require("../dto/check-in.dto");
const check_out_dto_1 = require("../dto/check-out.dto");
const geofence_exit_dto_1 = require("../dto/geofence-exit.dto");
const geofence_return_dto_1 = require("../dto/geofence-return.dto");
const sync_dto_1 = require("../dto/sync.dto");
const history_query_dto_1 = require("../dto/history-query.dto");
const api_message_decorator_1 = require("../../common/decorators/api-message.decorator");
const current_employee_decorator_1 = require("../../common/decorators/current-employee.decorator");
let AttendanceController = class AttendanceController {
    constructor(attendanceService) {
        this.attendanceService = attendanceService;
    }
    async checkIn(employee, dto) {
        const result = await this.attendanceService.checkIn(employee.employeeId, dto);
        return result.session;
    }
    async checkOut(employee, dto) {
        const result = await this.attendanceService.checkOut(employee.employeeId, dto);
        return result.session;
    }
    async geofenceExit(employee, dto) {
        const result = await this.attendanceService.geofenceExit(employee.employeeId, dto);
        return result.session;
    }
    async geofenceReturn(employee, dto) {
        const result = await this.attendanceService.geofenceReturn(employee.employeeId, dto);
        return result.session;
    }
    async sync(employee, dto) {
        return this.attendanceService.sync(employee.employeeId, dto);
    }
    async allToday() {
        return this.attendanceService.getAllToday();
    }
    async allHistory(query) {
        return this.attendanceService.getAllHistory(query);
    }
    isHrOrAdmin(roles) {
        if (!roles || !roles.length)
            return false;
        return roles.some((r) => {
            const clean = String(r).replace(/['"\[\]]/g, '').trim().toUpperCase();
            return ['HR', 'ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'].includes(clean);
        });
    }
    async today(employee, all, employeeIdQuery) {
        if (all === 'true' || employeeIdQuery === 'ALL') {
            return this.attendanceService.getAllToday();
        }
        const isHrOrAdmin = this.isHrOrAdmin(employee?.roles);
        if (isHrOrAdmin && !employeeIdQuery) {
            return this.attendanceService.getAllToday();
        }
        const targetEmployeeId = employeeIdQuery || employee.employeeId;
        return this.attendanceService.getToday(targetEmployeeId);
    }
    async history(employee, query, all, employeeIdQuery) {
        const effectiveAll = all === 'true' ||
            employeeIdQuery === 'ALL' ||
            query.all === 'true' ||
            query.employeeId === 'ALL';
        if (effectiveAll) {
            return this.attendanceService.getAllHistory(query);
        }
        const isHrOrAdmin = this.isHrOrAdmin(employee?.roles);
        const targetEmployeeId = employeeIdQuery || query.employeeId || employee?.employeeId;
        if (isHrOrAdmin && !employeeIdQuery && !query.employeeId) {
            return this.attendanceService.getAllHistory(query);
        }
        return this.attendanceService.getHistory(targetEmployeeId, query);
    }
    async getById(employee, sessionId) {
        return this.attendanceService.getById(employee.employeeId, sessionId);
    }
};
exports.AttendanceController = AttendanceController;
__decorate([
    (0, common_1.Post)('check-in'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, api_message_decorator_1.ApiMessage)('Attendance checked in successfully'),
    __param(0, (0, current_employee_decorator_1.CurrentEmployee)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, check_in_dto_1.CheckInDto]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "checkIn", null);
__decorate([
    (0, common_1.Post)('check-out'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, api_message_decorator_1.ApiMessage)('Attendance checked out successfully'),
    __param(0, (0, current_employee_decorator_1.CurrentEmployee)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, check_out_dto_1.CheckOutDto]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "checkOut", null);
__decorate([
    (0, common_1.Post)('geofence-exit'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, api_message_decorator_1.ApiMessage)('Geofence exit recorded'),
    __param(0, (0, current_employee_decorator_1.CurrentEmployee)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, geofence_exit_dto_1.GeofenceExitDto]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "geofenceExit", null);
__decorate([
    (0, common_1.Post)('geofence-return'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, api_message_decorator_1.ApiMessage)('Geofence return recorded'),
    __param(0, (0, current_employee_decorator_1.CurrentEmployee)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, geofence_return_dto_1.GeofenceReturnDto]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "geofenceReturn", null);
__decorate([
    (0, common_1.Post)('sync'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, api_message_decorator_1.ApiMessage)('Offline events synced'),
    __param(0, (0, current_employee_decorator_1.CurrentEmployee)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, sync_dto_1.SyncDto]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "sync", null);
__decorate([
    (0, common_1.Get)('all-today'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "allToday", null);
__decorate([
    (0, common_1.Get)('all-history'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [history_query_dto_1.HistoryQueryDto]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "allHistory", null);
__decorate([
    (0, common_1.Get)('today'),
    __param(0, (0, current_employee_decorator_1.CurrentEmployee)()),
    __param(1, (0, common_1.Query)('all')),
    __param(2, (0, common_1.Query)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "today", null);
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, current_employee_decorator_1.CurrentEmployee)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Query)('all')),
    __param(3, (0, common_1.Query)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, history_query_dto_1.HistoryQueryDto, String, String]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "history", null);
__decorate([
    (0, common_1.Get)(':sessionId'),
    __param(0, (0, current_employee_decorator_1.CurrentEmployee)()),
    __param(1, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "getById", null);
exports.AttendanceController = AttendanceController = __decorate([
    (0, swagger_1.ApiTags)('attendance'),
    (0, common_1.Controller)('attendance'),
    __metadata("design:paramtypes", [attendance_service_1.AttendanceService])
], AttendanceController);
//# sourceMappingURL=attendance.controller.js.map