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
var ExceptionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExceptionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const app_exception_1 = require("../../common/exceptions/app.exception");
const error_codes_1 = require("../../common/constants/error-codes");
const create_exception_dto_1 = require("../dto/create-exception.dto");
const approve_exception_dto_1 = require("../dto/approve-exception.dto");
const client_1 = require("@prisma/client");
const notification_client_service_1 = require("../../notifications/notification-client.service");
let ExceptionsService = ExceptionsService_1 = class ExceptionsService {
    constructor(prisma, notificationClient) {
        this.prisma = prisma;
        this.notificationClient = notificationClient;
        this.logger = new common_1.Logger(ExceptionsService_1.name);
    }
    async createException(dto) {
        const attendanceDate = new Date(dto.attendanceDate);
        let validFrom;
        let validUntil;
        if (dto.validFrom && dto.validUntil) {
            validFrom = new Date(dto.validFrom);
            validUntil = new Date(dto.validUntil);
            if (validUntil <= validFrom) {
                throw new app_exception_1.AppException(error_codes_1.ErrorCodes.VALIDATION_FAILED, 'validUntil must be after validFrom', common_1.HttpStatus.BAD_REQUEST);
            }
        }
        else {
            validFrom = new Date(dto.attendanceDate);
            validFrom.setHours(0, 0, 0, 0);
            validUntil = new Date(dto.attendanceDate);
            validUntil.setHours(23, 59, 59, 999);
        }
        const existingPending = await this.prisma.attendanceException.findFirst({
            where: {
                employeeId: dto.employeeId,
                attendanceDate,
                type: dto.type,
                status: client_1.ExceptionStatus.PENDING,
            },
        });
        if (existingPending) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.VALIDATION_FAILED, 'A pending special working-hours request already exists for this date. Please wait for HR to review it.', common_1.HttpStatus.CONFLICT);
        }
        const additionalHours = Number(dto.additionalHours) ||
            (Number(dto.additionalMinutes) ? Number(dto.additionalMinutes) / 60 : 0);
        const additionalMinutes = Number(dto.additionalMinutes) || Math.round(additionalHours * 60);
        const additionalSeconds = additionalMinutes * 60;
        const metadata = {
            ...(dto.metadata || {}),
            additionalHours,
            additionalMinutes,
            additionalSeconds,
            hrEmail: (dto.hrEmail || dto.metadata?.hrEmail || 'hr@company.com').trim().toLowerCase(),
            employeeName: dto.metadata?.employeeName || 'Employee',
            employeeEmail: dto.metadata?.employeeEmail || '',
            dateStr: dto.attendanceDate,
        };
        const exception = await this.prisma.attendanceException.create({
            data: {
                employeeId: dto.employeeId,
                attendanceDate,
                type: dto.type,
                reason: dto.reason?.trim() || 'Special working hours requested',
                attendanceSessionId: dto.attendanceSessionId,
                validFrom,
                validUntil,
                status: client_1.ExceptionStatus.PENDING,
                metadata,
            },
        });
        this.logger.log(`Created attendance exception ${exception.id} for employee ${dto.employeeId}`);
        const targetHrEmail = metadata.hrEmail;
        const empName = metadata.employeeName || dto.employeeId;
        void this.notificationClient.sendNotification({
            recipientId: targetHrEmail || 'HR',
            recipientType: 'HR',
            type: 'SPECIAL_WORKING_HOURS_REQUEST',
            title: 'Special Working Hours Request',
            body: `Employee ${empName} requested +${additionalHours} hours for ${dto.attendanceDate}.\nMessage: ${dto.reason?.trim()}`,
            metadata: {
                exceptionId: exception.id,
                employeeId: dto.employeeId,
                employeeName: empName,
                employeeEmail: metadata.employeeEmail,
                hrEmail: targetHrEmail,
                attendanceDate: dto.attendanceDate,
                requestedHours: additionalHours,
                additionalMinutes,
                additionalSeconds,
                reason: dto.reason?.trim(),
                createdAt: exception.createdAt.toISOString(),
            },
        });
        return exception;
    }
    async approveException(id, approverUserId, dto) {
        let exception = await this.prisma.attendanceException.findUnique({
            where: { id },
        });
        if (!exception) {
            if (dto.employeeId && dto.attendanceDate) {
                const attDate = new Date(dto.attendanceDate);
                attDate.setHours(0, 0, 0, 0);
                const validFrom = new Date(attDate);
                const validUntil = new Date(attDate);
                validUntil.setHours(23, 59, 59, 999);
                const addHours = Number(dto.additionalHours) ||
                    (dto.metadata?.additionalHours ? Number(dto.metadata.additionalHours) : 0);
                const addMinutes = Math.round(addHours * 60);
                exception = await this.prisma.attendanceException.create({
                    data: {
                        id,
                        employeeId: dto.employeeId,
                        attendanceDate: attDate,
                        type: create_exception_dto_1.ExceptionType.WORKING_TIME_ADJUSTMENT,
                        reason: dto.reason || 'Special working hours requested',
                        validFrom,
                        validUntil,
                        status: client_1.ExceptionStatus.PENDING,
                        metadata: {
                            ...(dto.metadata || {}),
                            additionalHours: addHours,
                            additionalMinutes: addMinutes,
                            additionalSeconds: addMinutes * 60,
                            dateStr: dto.attendanceDate,
                            reason: dto.reason,
                            employeeName: dto.metadata?.employeeName || 'Employee',
                            employeeEmail: dto.metadata?.employeeEmail || '',
                            hrEmail: dto.metadata?.hrEmail || dto.approverEmail || 'hr@company.com',
                        },
                    },
                });
                this.logger.log(`Self-healed missing exception ${id} for employee ${dto.employeeId}`);
            }
            else {
                throw new app_exception_1.AppException(error_codes_1.ErrorCodes.NOT_FOUND, 'Attendance exception not found', common_1.HttpStatus.NOT_FOUND);
            }
        }
        if (exception.status !== client_1.ExceptionStatus.PENDING) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.INVALID_STATE_TRANSITION, `Exception is already ${exception.status}. Cannot re-approve or modify.`, common_1.HttpStatus.UNPROCESSABLE_ENTITY);
        }
        const isApproved = dto.status === approve_exception_dto_1.ApproveStatus.APPROVED;
        const meta = exception.metadata || {};
        const additionalHours = meta.additionalHours ||
            (meta.additionalMinutes ? meta.additionalMinutes / 60 : 0);
        const dateFormatted = exception.attendanceDate.toISOString().split('T')[0];
        const isUuid = (val) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim()));
        let approverName = 'HR Administrator';
        if (dto.approverName && !isUuid(dto.approverName)) {
            approverName = dto.approverName.trim();
        }
        else if (dto.approverEmail) {
            approverName = dto.approverEmail.trim();
        }
        else if (meta.hrEmail) {
            approverName = meta.hrEmail;
        }
        const updatedMetadata = {
            ...meta,
            approvedByUserId: approverUserId,
            approvedByName: approverName,
            approvedByEmail: dto.approverEmail || meta.hrEmail || 'hr@company.com',
            approvedAt: new Date().toISOString(),
            comment: dto.comment,
        };
        const updated = await this.prisma.attendanceException.update({
            where: { id },
            data: {
                status: isApproved ? client_1.ExceptionStatus.APPROVED : client_1.ExceptionStatus.REJECTED,
                approvedByUserId: approverUserId,
                approvedAt: new Date(),
                metadata: updatedMetadata,
            },
        });
        this.logger.log(`Exception ${id} was ${dto.status} by user ${approverUserId}`);
        if (isApproved) {
            void this.notificationClient.sendNotification({
                recipientId: exception.employeeId,
                type: 'SPECIAL_CONDITION_APPROVED',
                title: 'Special Condition Approved',
                body: `HR approved your request for +${additionalHours} hours on ${dateFormatted}.`,
                metadata: {
                    exceptionId: exception.id,
                    type: exception.type,
                    status: updated.status,
                    additionalHours,
                    attendanceDate: dateFormatted,
                },
            });
        }
        else {
            void this.notificationClient.sendNotification({
                recipientId: exception.employeeId,
                type: 'SPECIAL_CONDITION_REJECTED',
                title: 'Special Condition Request Rejected',
                body: `Your request for additional working hours on ${dateFormatted} was rejected by HR.`,
                metadata: {
                    exceptionId: exception.id,
                    type: exception.type,
                    status: updated.status,
                    attendanceDate: dateFormatted,
                },
            });
        }
        return updated;
    }
    async getExceptions(employeeId, status, hrEmail) {
        const empIds = employeeId
            ? employeeId.split(',').map((s) => s.trim()).filter(Boolean)
            : [];
        let list = await this.prisma.attendanceException.findMany({
            where: {
                ...(empIds.length > 1
                    ? { employeeId: { in: empIds } }
                    : empIds.length === 1
                        ? { employeeId: empIds[0] }
                        : {}),
                ...(status ? { status } : {}),
            },
            orderBy: { createdAt: 'desc' },
        });
        if (empIds.length > 0 && list.length === 0) {
            const allForStatus = await this.prisma.attendanceException.findMany({
                where: {
                    ...(status ? { status } : {}),
                },
                orderBy: { createdAt: 'desc' },
            });
            list = allForStatus.filter((ex) => {
                if (empIds.includes(ex.employeeId))
                    return true;
                const meta = ex.metadata || {};
                if (meta.employeeId && empIds.includes(String(meta.employeeId)))
                    return true;
                if (meta.employeeCode && empIds.includes(String(meta.employeeCode)))
                    return true;
                return false;
            });
        }
        if (hrEmail) {
            const hrLower = hrEmail.trim().toLowerCase();
            return list.filter((ex) => {
                const meta = ex.metadata || {};
                return !meta.hrEmail || meta.hrEmail.toLowerCase() === hrLower;
            });
        }
        return list;
    }
    async getExceptionById(id) {
        const exception = await this.prisma.attendanceException.findUnique({
            where: { id },
        });
        if (!exception) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.NOT_FOUND, 'Attendance exception not found', common_1.HttpStatus.NOT_FOUND);
        }
        const meta = exception.metadata || {};
        const isUuid = (val) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim()));
        if (meta.approvedByName && isUuid(meta.approvedByName)) {
            meta.approvedByName = meta.approvedByEmail || meta.hrEmail || 'HR Administrator';
        }
        return {
            ...exception,
            metadata: meta,
        };
    }
    async cancelException(id) {
        const exception = await this.prisma.attendanceException.findUnique({
            where: { id },
        });
        if (!exception) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.NOT_FOUND, 'Exception not found', common_1.HttpStatus.NOT_FOUND);
        }
        if (exception.status !== client_1.ExceptionStatus.PENDING) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.INVALID_STATE_TRANSITION, 'Cannot cancel an exception that has already been approved or rejected.', common_1.HttpStatus.BAD_REQUEST);
        }
        await this.prisma.attendanceException.delete({
            where: { id },
        });
        return { success: true, message: 'Attendance exception cancelled' };
    }
};
exports.ExceptionsService = ExceptionsService;
exports.ExceptionsService = ExceptionsService = ExceptionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_client_service_1.NotificationClientService])
], ExceptionsService);
//# sourceMappingURL=exceptions.service.js.map