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
var AttendanceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../database/prisma.service");
const app_exception_1 = require("../../common/exceptions/app.exception");
const error_codes_1 = require("../../common/constants/error-codes");
const employee_provider_interface_1 = require("../../employee/interfaces/employee-provider.interface");
const geofence_provider_interface_1 = require("../../geofence/interfaces/geofence-provider.interface");
const attendance_policy_provider_interface_1 = require("../../policy/interfaces/attendance-policy-provider.interface");
const face_ai_provider_interface_1 = require("../../face/interfaces/face-ai-provider.interface");
const working_time_service_1 = require("./working-time.service");
const notification_client_service_1 = require("../../notifications/notification-client.service");
const enums_1 = require("../enums");
const INVALID_STATE_CODES = new Set([
    error_codes_1.ErrorCodes.ATTENDANCE_ALREADY_ACTIVE,
    error_codes_1.ErrorCodes.ATTENDANCE_ALREADY_COMPLETED,
    error_codes_1.ErrorCodes.NO_ACTIVE_SESSION,
    error_codes_1.ErrorCodes.INVALID_STATE_TRANSITION,
    error_codes_1.ErrorCodes.CHECKOUT_WHILE_PAUSED_NOT_ALLOWED,
]);
let AttendanceService = AttendanceService_1 = class AttendanceService {
    constructor(prisma, workingTimeService, geofenceProvider, employeeProvider, policyProvider, faceAiProvider, notificationClient) {
        this.prisma = prisma;
        this.workingTimeService = workingTimeService;
        this.geofenceProvider = geofenceProvider;
        this.employeeProvider = employeeProvider;
        this.policyProvider = policyProvider;
        this.faceAiProvider = faceAiProvider;
        this.notificationClient = notificationClient;
        this.logger = new common_1.Logger(AttendanceService_1.name);
    }
    async resolveEmployeeIds(employeeId) {
        if (!employeeId)
            return [];
        try {
            if (typeof this.employeeProvider.resolveEmployeeIdentifiers === 'function') {
                const resolved = await this.employeeProvider.resolveEmployeeIdentifiers(employeeId);
                if (resolved && resolved.length > 0)
                    return resolved;
            }
        }
        catch (e) {
            this.logger.debug(`Could not resolve alternate identifiers for ${employeeId}: ${e.message}`);
        }
        return [employeeId];
    }
    async checkIn(employeeId, dto, effectiveTime = new Date(), source = enums_1.AttendanceEventSource.ONLINE) {
        const replay = await this.findIdempotentReplay(dto.clientEventId, enums_1.AttendanceEventType.CHECK_IN);
        if (replay)
            return replay;
        const policy = await this.policyProvider.getPolicy(dto.officeId);
        this.validateLocationAccuracy(dto.location, policy);
        const assigned = await this.employeeProvider.isAssignedToOffice(employeeId, dto.officeId);
        if (!assigned) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.EMPLOYEE_NOT_ASSIGNED_TO_OFFICE, 'Employee is not assigned to this office', common_1.HttpStatus.FORBIDDEN);
        }
        const inside = await this.geofenceProvider.isInsideOffice(dto.officeId, dto.location.latitude, dto.location.longitude);
        if (!inside) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.OUTSIDE_GEOFENCE, 'Employee location is outside the office boundary', common_1.HttpStatus.UNPROCESSABLE_ENTITY);
        }
        const faceResult = await this.faceAiProvider.validateVerificationToken(employeeId, dto.faceVerificationToken);
        if (!faceResult.valid) {
            this.logger.warn(`Check-in rejected for employee ${employeeId}: face verification failed (${faceResult.message})`);
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.FACE_VERIFICATION_FAILED, `Face biometric verification failed: ${faceResult.message}`, common_1.HttpStatus.FORBIDDEN);
        }
        const attendanceDate = this.toDateOnly(effectiveTime);
        const checkInStatus = this.determineCheckInStatus(effectiveTime, policy);
        const session = await this.prisma.$transaction(async (tx) => {
            await tx.employeeAttendanceLock.upsert({
                where: { employeeId },
                update: {},
                create: { employeeId },
            });
            await tx.$queryRawUnsafe('SELECT employee_id FROM employee_attendance_locks WHERE employee_id = ? FOR UPDATE', employeeId);
            const existingEvent = await tx.attendanceEvent.findUnique({
                where: { clientEventId: dto.clientEventId },
            });
            if (existingEvent) {
                return null;
            }
            const ids = await this.resolveEmployeeIds(employeeId);
            const activeSession = await tx.attendanceSession.findFirst({
                where: { employeeId: { in: ids }, status: { in: [enums_1.AttendanceStatus.WORKING, enums_1.AttendanceStatus.PAUSED] } },
                include: { pauses: true },
            });
            if (activeSession) {
                const sessionDateOnly = this.toDateOnly(activeSession.attendanceDate);
                if (sessionDateOnly.getTime() < attendanceDate.getTime()) {
                    const autoCheckoutTime = this.getMidnightCutoffForSession(activeSession.checkInAt);
                    this.logger.warn(`Employee ${employeeId} has a stale unclosed session ${activeSession.id} from ${this.formatDateOnly(sessionDateOnly)}. Auto-closing it at midnight (${autoCheckoutTime.toISOString()}) so today's check-in can proceed.`);
                    const totalWorkingSeconds = this.workingTimeService.calculateWorkingSeconds({
                        status: enums_1.AttendanceStatus.CHECKED_OUT,
                        checkInAt: activeSession.checkInAt,
                        checkOutAt: autoCheckoutTime,
                        currentPauseStartedAt: null,
                    }, activeSession.pauses, autoCheckoutTime);
                    await tx.attendanceSession.update({
                        where: { id: activeSession.id },
                        data: {
                            status: enums_1.AttendanceStatus.CHECKED_OUT,
                            checkOutAt: autoCheckoutTime,
                            checkoutType: enums_1.CheckoutType.AUTO,
                            checkoutReason: enums_1.CheckoutReason.SYSTEM_ACTION,
                            totalWorkingSeconds,
                            currentPauseStartedAt: null,
                            currentGraceDeadline: null,
                        },
                    });
                    const openPause = activeSession.pauses.find((p) => p.endedAt === null);
                    if (openPause) {
                        await tx.attendancePause.updateMany({
                            where: { id: openPause.id, endedAt: null },
                            data: {
                                endedAt: autoCheckoutTime,
                                durationSeconds: Math.max(0, Math.round((autoCheckoutTime.getTime() - openPause.startedAt.getTime()) / 1000)),
                                endReason: enums_1.PauseEndReason.AUTO_CHECKOUT,
                            },
                        });
                    }
                }
                else {
                    throw new app_exception_1.AppException(error_codes_1.ErrorCodes.ATTENDANCE_ALREADY_ACTIVE, 'Employee already has an active attendance session');
                }
            }
            const completedToday = await tx.attendanceSession.findFirst({
                where: {
                    employeeId,
                    attendanceDate,
                    status: enums_1.AttendanceStatus.CHECKED_OUT,
                },
            });
            let reopenReason = undefined;
            let reopenAuthorizedBy = undefined;
            if (completedToday) {
                const approvedException = await tx.attendanceException?.findFirst?.({
                    where: {
                        employeeId,
                        attendanceDate,
                        type: 'RECHECK_IN',
                        status: 'APPROVED',
                        validFrom: { lte: effectiveTime },
                        validUntil: { gte: effectiveTime },
                    },
                    orderBy: { approvedAt: 'desc' },
                });
                if (approvedException) {
                    reopenReason = approvedException.reason;
                    reopenAuthorizedBy = approvedException.approvedByUserId ?? undefined;
                    await tx.attendanceException.update({
                        where: { id: approvedException.id },
                        data: { status: 'USED' },
                    });
                }
                else {
                    reopenReason = 'RECHECK_IN';
                }
            }
            const created = await tx.attendanceSession.create({
                data: {
                    employeeId,
                    officeId: dto.officeId,
                    attendanceDate,
                    status: enums_1.AttendanceStatus.WORKING,
                    checkInAt: effectiveTime,
                    checkInStatus,
                    reopenReason,
                    reopenAuthorizedBy,
                },
            });
            await tx.attendanceEvent.create({
                data: {
                    attendanceSessionId: created.id,
                    employeeId,
                    clientEventId: dto.clientEventId,
                    eventType: enums_1.AttendanceEventType.CHECK_IN,
                    eventTime: effectiveTime,
                    latitude: dto.location.latitude,
                    longitude: dto.location.longitude,
                    altitudeMeters: dto.location.altitudeMeters,
                    accuracyMeters: dto.location.accuracyMeters,
                    source,
                },
            });
            return { ...created, pauses: [] };
        });
        if (!session) {
            const replayAfterRace = await this.findIdempotentReplay(dto.clientEventId, enums_1.AttendanceEventType.CHECK_IN);
            if (replayAfterRace)
                return replayAfterRace;
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.CONFLICT, 'Concurrent check-in could not be resolved, please retry');
        }
        this.logger.log(`CHECK_IN employeeId=${employeeId} sessionId=${session.id}`);
        void this.notificationClient.sendNotification({
            recipientId: employeeId,
            type: 'CHECKIN_CONFIRMATION',
            title: 'Check-in Verified',
            body: `You checked in at ${effectiveTime.toLocaleTimeString()} at office ${dto.officeId}.`,
            metadata: { sessionId: session.id, officeId: dto.officeId },
        });
        return { session: this.toSessionDto(session, session.pauses, effectiveTime), idempotentReplay: false };
    }
    async checkOut(employeeId, dto, effectiveTime = new Date(), source = enums_1.AttendanceEventSource.ONLINE) {
        const replay = await this.findIdempotentReplay(dto.clientEventId, enums_1.AttendanceEventType.CHECK_OUT);
        if (replay)
            return replay;
        const policy = await this.policyProvider.getPolicy(dto.officeId ?? '');
        const ids = await this.resolveEmployeeIds(employeeId);
        const active = await this.prisma.attendanceSession.findFirst({
            where: { employeeId: { in: ids }, status: { in: [enums_1.AttendanceStatus.WORKING, enums_1.AttendanceStatus.PAUSED] } },
            include: { pauses: true },
            orderBy: { checkInAt: 'desc' },
        });
        if (!active) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.NO_ACTIVE_SESSION, 'No active attendance session to check out');
        }
        if (active.status === enums_1.AttendanceStatus.PAUSED && !policy.allowManualCheckoutWhilePaused) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.CHECKOUT_WHILE_PAUSED_NOT_ALLOWED, 'Cannot manually check out while paused; return to the office first');
        }
        const totalWorkingSeconds = this.workingTimeService.calculateWorkingSeconds({ status: enums_1.AttendanceStatus.CHECKED_OUT, checkInAt: active.checkInAt, checkOutAt: effectiveTime, currentPauseStartedAt: null }, active.pauses, effectiveTime);
        const updated = await this.prisma.$transaction(async (tx) => {
            const { count } = await tx.attendanceSession.updateMany({
                where: { id: active.id, status: active.status },
                data: {
                    status: enums_1.AttendanceStatus.CHECKED_OUT,
                    checkOutAt: effectiveTime,
                    checkoutType: enums_1.CheckoutType.MANUAL,
                    checkoutReason: enums_1.CheckoutReason.USER_CHECKOUT,
                    totalWorkingSeconds,
                    currentPauseStartedAt: null,
                    currentGraceDeadline: null,
                },
            });
            if (count === 0) {
                throw new app_exception_1.AppException(error_codes_1.ErrorCodes.CONFLICT, 'Attendance session was modified concurrently (e.g. already auto-checked-out); please retry');
            }
            if (active.status === enums_1.AttendanceStatus.PAUSED) {
                const openPause = active.pauses.find((p) => p.endedAt === null);
                if (openPause) {
                    await tx.attendancePause.updateMany({
                        where: { id: openPause.id, endedAt: null },
                        data: {
                            endedAt: effectiveTime,
                            durationSeconds: Math.round((effectiveTime.getTime() - openPause.startedAt.getTime()) / 1000),
                            endReason: enums_1.PauseEndReason.RETURNED,
                        },
                    });
                }
            }
            await tx.attendanceEvent.create({
                data: {
                    attendanceSessionId: active.id,
                    employeeId,
                    clientEventId: dto.clientEventId,
                    eventType: enums_1.AttendanceEventType.CHECK_OUT,
                    eventTime: effectiveTime,
                    latitude: dto.location?.latitude,
                    longitude: dto.location?.longitude,
                    altitudeMeters: dto.location?.altitudeMeters,
                    accuracyMeters: dto.location?.accuracyMeters,
                    source,
                },
            });
            return tx.attendanceSession.findUniqueOrThrow({
                where: { id: active.id },
                include: { pauses: true },
            });
        });
        this.logger.log(`CHECK_OUT employeeId=${employeeId} sessionId=${updated.id}`);
        const sessionDto = this.toSessionDto(updated, updated.pauses, effectiveTime);
        void this.notificationClient.sendNotification({
            recipientId: employeeId,
            type: 'CHECKOUT_CONFIRMATION',
            title: 'Check-out Recorded',
            body: `You checked out at ${effectiveTime.toLocaleTimeString()}. Worked: ${Math.round((sessionDto.totalWorkingSeconds || 0) / 60)} minutes.`,
            metadata: { sessionId: updated.id, totalWorkingSeconds: sessionDto.totalWorkingSeconds },
        });
        return { session: sessionDto, idempotentReplay: false };
    }
    async geofenceExit(employeeId, dto, effectiveTime = new Date(), source = enums_1.AttendanceEventSource.ONLINE) {
        const replay = await this.findIdempotentReplay(dto.clientEventId, enums_1.AttendanceEventType.GEOFENCE_EXIT);
        if (replay)
            return replay;
        const ids = await this.resolveEmployeeIds(employeeId);
        const working = await this.prisma.attendanceSession.findFirst({
            where: { employeeId: { in: ids }, status: enums_1.AttendanceStatus.WORKING },
            include: { pauses: true },
        });
        if (!working) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.INVALID_STATE_TRANSITION, 'Employee must have an active WORKING session to record a geofence exit');
        }
        const isSpecialExit = dto.reason === 'LOCATION_OFF' ||
            dto.reason === 'SIGN_OUT' ||
            dto.reason === 'MANUAL_PAUSE';
        if (!isSpecialExit) {
            const stillInside = await this.geofenceProvider.isInsideOffice(dto.officeId, dto.location.latitude, dto.location.longitude);
            if (stillInside) {
                throw new app_exception_1.AppException(error_codes_1.ErrorCodes.STILL_INSIDE_GEOFENCE, 'Location still reports inside the office boundary; exit not confirmed', common_1.HttpStatus.UNPROCESSABLE_ENTITY);
            }
        }
        const policy = await this.policyProvider.getPolicy(dto.officeId);
        const graceDeadline = new Date(effectiveTime.getTime() + policy.gracePeriodMinutes * 60_000);
        const updated = await this.prisma.$transaction(async (tx) => {
            const existingOpenPause = await tx.attendancePause.findFirst({
                where: { attendanceSessionId: working.id, endedAt: null },
            });
            if (existingOpenPause) {
                throw new app_exception_1.AppException(error_codes_1.ErrorCodes.CONFLICT, 'Session already has an open pause');
            }
            const { count } = await tx.attendanceSession.updateMany({
                where: { id: working.id, status: enums_1.AttendanceStatus.WORKING },
                data: {
                    status: enums_1.AttendanceStatus.PAUSED,
                    currentPauseStartedAt: effectiveTime,
                    currentGraceDeadline: graceDeadline,
                },
            });
            if (count === 0) {
                throw new app_exception_1.AppException(error_codes_1.ErrorCodes.CONFLICT, 'Session state changed concurrently; please retry');
            }
            await tx.attendancePause.create({
                data: {
                    attendanceSessionId: working.id,
                    startedAt: effectiveTime,
                    graceDeadline,
                },
            });
            await tx.attendanceEvent.create({
                data: {
                    attendanceSessionId: working.id,
                    employeeId,
                    clientEventId: dto.clientEventId,
                    eventType: enums_1.AttendanceEventType.GEOFENCE_EXIT,
                    eventTime: effectiveTime,
                    latitude: dto.location.latitude,
                    longitude: dto.location.longitude,
                    altitudeMeters: dto.location.altitudeMeters,
                    accuracyMeters: dto.location.accuracyMeters,
                    source,
                },
            });
            return tx.attendanceSession.findUniqueOrThrow({
                where: { id: working.id },
                include: { pauses: true },
            });
        });
        this.logger.log(`GEOFENCE_EXIT employeeId=${employeeId} sessionId=${updated.id}`);
        const notificationTitle = dto.reason === 'LOCATION_OFF'
            ? 'Location Turned Off'
            : dto.reason === 'SIGN_OUT'
                ? 'Signed Out from Momo HRMS'
                : 'Geofence Exit Detected';
        const notificationBody = dto.reason === 'LOCATION_OFF'
            ? 'Location services were disabled. Working timer paused automatically. Turn on location inside office to resume.'
            : dto.reason === 'SIGN_OUT'
                ? 'You signed out of the app. Working timer paused automatically.'
                : `You stepped outside the office polygon. Session paused. Return before ${graceDeadline.toLocaleTimeString()} to resume.`;
        void this.notificationClient.sendNotification({
            recipientId: employeeId,
            type: 'GEOFENCE_EXIT_WARNING',
            title: notificationTitle,
            body: notificationBody,
            metadata: { sessionId: updated.id, officeId: dto.officeId, graceDeadline, reason: dto.reason },
        });
        const dayAdj = await this.getDayAdjustment(ids, updated.attendanceDate);
        return { session: this.toSessionDto(updated, updated.pauses, effectiveTime, dayAdj.seconds, dayAdj.reason), idempotentReplay: false };
    }
    async geofenceReturn(employeeId, dto, effectiveTime = new Date(), source = enums_1.AttendanceEventSource.ONLINE) {
        const replay = await this.findIdempotentReplay(dto.clientEventId, enums_1.AttendanceEventType.GEOFENCE_RETURN);
        if (replay)
            return replay;
        const ids = await this.resolveEmployeeIds(employeeId);
        const paused = await this.prisma.attendanceSession.findFirst({
            where: { employeeId: { in: ids }, status: enums_1.AttendanceStatus.PAUSED },
            include: { pauses: true },
        });
        if (!paused) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.INVALID_STATE_TRANSITION, 'Employee must have a PAUSED session to record a geofence return');
        }
        const inside = await this.geofenceProvider.isInsideOffice(dto.officeId, dto.location.latitude, dto.location.longitude);
        if (!inside) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.OUTSIDE_GEOFENCE, 'Location does not confirm the employee is back inside the office boundary', common_1.HttpStatus.UNPROCESSABLE_ENTITY);
        }
        const openPause = paused.pauses.find((p) => p.endedAt === null);
        if (!openPause) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.CONFLICT, 'No active pause found for this session');
        }
        const durationSeconds = Math.max(0, Math.round((effectiveTime.getTime() - openPause.startedAt.getTime()) / 1000));
        const updated = await this.prisma.$transaction(async (tx) => {
            const pauseUpdate = await tx.attendancePause.updateMany({
                where: { id: openPause.id, endedAt: null },
                data: { endedAt: effectiveTime, durationSeconds, endReason: enums_1.PauseEndReason.RETURNED },
            });
            if (pauseUpdate.count === 0) {
                throw new app_exception_1.AppException(error_codes_1.ErrorCodes.CONFLICT, 'Pause was already closed concurrently; please retry');
            }
            const sessionUpdate = await tx.attendanceSession.updateMany({
                where: { id: paused.id, status: enums_1.AttendanceStatus.PAUSED },
                data: {
                    status: enums_1.AttendanceStatus.WORKING,
                    currentPauseStartedAt: null,
                    currentGraceDeadline: null,
                },
            });
            if (sessionUpdate.count === 0) {
                throw new app_exception_1.AppException(error_codes_1.ErrorCodes.CONFLICT, 'Session state changed concurrently (e.g. auto-checkout already ran); please retry');
            }
            await tx.attendanceEvent.create({
                data: {
                    attendanceSessionId: paused.id,
                    employeeId,
                    clientEventId: dto.clientEventId,
                    eventType: enums_1.AttendanceEventType.GEOFENCE_RETURN,
                    eventTime: effectiveTime,
                    latitude: dto.location.latitude,
                    longitude: dto.location.longitude,
                    altitudeMeters: dto.location.altitudeMeters,
                    accuracyMeters: dto.location.accuracyMeters,
                    source,
                },
            });
            return tx.attendanceSession.findUniqueOrThrow({
                where: { id: paused.id },
                include: { pauses: true },
            });
        });
        this.logger.log(`GEOFENCE_RETURN employeeId=${employeeId} sessionId=${updated.id}`);
        void this.notificationClient.sendNotification({
            recipientId: employeeId,
            type: 'GEOFENCE_RETURN',
            title: 'Returned to Office',
            body: 'Welcome back to the office polygon. Your session is active again.',
            metadata: { sessionId: updated.id },
        });
        const dayAdj = await this.getDayAdjustment(ids, updated.attendanceDate);
        return { session: this.toSessionDto(updated, updated.pauses, effectiveTime, dayAdj.seconds, dayAdj.reason), idempotentReplay: false };
    }
    async sync(employeeId, dto) {
        const results = [];
        for (const event of dto.events) {
            try {
                const effectiveTime = new Date(event.eventTime);
                const source = enums_1.AttendanceEventSource.OFFLINE_SYNC;
                let result;
                switch (event.eventType) {
                    case enums_1.AttendanceEventType.CHECK_IN:
                        result = await this.checkIn(employeeId, {
                            officeId: event.officeId,
                            location: this.requireLocation(event),
                            clientEventId: event.clientEventId,
                            faceVerificationToken: event.faceVerificationToken ?? '',
                        }, effectiveTime, source);
                        break;
                    case enums_1.AttendanceEventType.CHECK_OUT:
                        result = await this.checkOut(employeeId, { officeId: event.officeId, location: event.location, clientEventId: event.clientEventId }, effectiveTime, source);
                        break;
                    case enums_1.AttendanceEventType.GEOFENCE_EXIT:
                        result = await this.geofenceExit(employeeId, { officeId: event.officeId, location: this.requireLocation(event), clientEventId: event.clientEventId }, effectiveTime, source);
                        break;
                    case enums_1.AttendanceEventType.GEOFENCE_RETURN:
                        result = await this.geofenceReturn(employeeId, { officeId: event.officeId, location: this.requireLocation(event), clientEventId: event.clientEventId }, effectiveTime, source);
                        break;
                    default:
                        results.push({
                            clientEventId: event.clientEventId,
                            status: enums_1.SyncResultStatus.REJECTED,
                            message: `Unsupported eventType for sync: ${event.eventType}`,
                        });
                        continue;
                }
                results.push({
                    clientEventId: event.clientEventId,
                    status: result.idempotentReplay ? enums_1.SyncResultStatus.ALREADY_PROCESSED : enums_1.SyncResultStatus.PROCESSED,
                });
            }
            catch (error) {
                results.push(this.toSyncResult(event.clientEventId, error));
            }
        }
        return { results };
    }
    async getToday(employeeId, now = new Date()) {
        const ids = await this.resolveEmployeeIds(employeeId);
        const attendanceDate = this.toDateOnly(now);
        const attendanceDateStr = this.formatDateOnly(attendanceDate);
        const sessions = await this.prisma.attendanceSession.findMany({
            where: { employeeId: { in: ids }, attendanceDate },
            include: { pauses: true },
            orderBy: { checkInAt: 'asc' },
        });
        const dayAdj = await this.getDayAdjustment(ids, attendanceDate);
        const totalAdjustmentSeconds = dayAdj.seconds;
        const combinedReason = dayAdj.reason;
        let sessionDtos = [];
        if (sessions.length > 0) {
            const activeIdx = sessions.findIndex((s) => s.status === enums_1.AttendanceStatus.WORKING || s.status === enums_1.AttendanceStatus.PAUSED);
            const targetIdx = activeIdx !== -1 ? activeIdx : sessions.length - 1;
            sessionDtos = sessions.map((s, idx) => {
                const adj = idx === targetIdx ? totalAdjustmentSeconds : 0;
                const r = idx === targetIdx ? combinedReason : undefined;
                return this.toSessionDto(s, s.pauses, now, adj, r);
            });
        }
        else if (totalAdjustmentSeconds > 0 && dayAdj.exceptions.length > 0) {
            sessionDtos = [
                this.createSynthesizedSpecialSession(ids[0] || employeeId, attendanceDateStr, dayAdj.exceptions[0], totalAdjustmentSeconds, combinedReason),
            ];
        }
        const totalWorkingSecondsToday = sessionDtos.reduce((sum, s) => sum + s.totalWorkingSeconds, 0);
        const totalRegularWorkingSecondsToday = sessionDtos.reduce((sum, s) => sum + (s.regularWorkingSeconds ?? 0), 0);
        const totalSpecialConditionSecondsToday = totalAdjustmentSeconds;
        const hasActiveSession = sessions.some((s) => s.status === enums_1.AttendanceStatus.WORKING || s.status === enums_1.AttendanceStatus.PAUSED);
        return {
            attendanceDate: attendanceDateStr,
            sessions: sessionDtos,
            totalWorkingSecondsToday,
            totalRegularWorkingSecondsToday,
            totalSpecialConditionSecondsToday,
            hasActiveSession,
        };
    }
    async getAllToday(now = new Date()) {
        const attendanceDate = this.toDateOnly(now);
        const attendanceDateStr = this.formatDateOnly(attendanceDate);
        const sessions = await this.prisma.attendanceSession.findMany({
            where: { attendanceDate },
            include: { pauses: true },
            orderBy: { checkInAt: 'asc' },
        });
        const approvedExceptions = await this.prisma.attendanceException.findMany({
            where: {
                attendanceDate,
                type: client_1.ExceptionType.WORKING_TIME_ADJUSTMENT,
                status: client_1.ExceptionStatus.APPROVED,
            },
        });
        const adjustmentsByEmployee = new Map();
        for (const ex of approvedExceptions) {
            const { seconds, reason } = this.extractAdjustmentFromException(ex);
            const prev = adjustmentsByEmployee.get(ex.employeeId) || { seconds: 0, reasons: [], exception: ex };
            prev.seconds += seconds;
            if (reason && !prev.reasons.includes(reason))
                prev.reasons.push(reason);
            adjustmentsByEmployee.set(ex.employeeId, prev);
        }
        const employeeAdjustmentsApplied = new Set();
        const sessionDtos = sessions.map((s) => {
            let adj = 0;
            let reason;
            if (!employeeAdjustmentsApplied.has(s.employeeId)) {
                const empAdj = adjustmentsByEmployee.get(s.employeeId);
                if (empAdj) {
                    adj = empAdj.seconds;
                    reason = empAdj.reasons.join('; ');
                    employeeAdjustmentsApplied.add(s.employeeId);
                }
            }
            return this.toSessionDto(s, s.pauses, now, adj, reason);
        });
        for (const [empId, empAdj] of adjustmentsByEmployee.entries()) {
            if (!employeeAdjustmentsApplied.has(empId) && empAdj.seconds > 0) {
                sessionDtos.push(this.createSynthesizedSpecialSession(empId, attendanceDateStr, empAdj.exception, empAdj.seconds, empAdj.reasons.join('; ')));
            }
        }
        const totalWorkingSecondsToday = sessionDtos.reduce((sum, s) => sum + s.totalWorkingSeconds, 0);
        const totalRegularWorkingSecondsToday = sessionDtos.reduce((sum, s) => sum + (s.regularWorkingSeconds ?? 0), 0);
        const totalSpecialConditionSecondsToday = Array.from(adjustmentsByEmployee.values()).reduce((sum, a) => sum + a.seconds, 0);
        const hasActiveSession = sessions.some((s) => s.status === enums_1.AttendanceStatus.WORKING || s.status === enums_1.AttendanceStatus.PAUSED);
        return {
            attendanceDate: attendanceDateStr,
            sessions: sessionDtos,
            totalWorkingSecondsToday,
            totalRegularWorkingSecondsToday,
            totalSpecialConditionSecondsToday,
            hasActiveSession,
        };
    }
    async getAllHistory(query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 1000;
        const endDate = query.endDate ? this.toDateOnly(new Date(query.endDate)) : this.toDateOnly(new Date());
        const startDate = query.startDate
            ? this.toDateOnly(new Date(query.startDate))
            : this.toDateOnly(new Date(endDate.getTime() - 29 * 24 * 60 * 60 * 1000));
        const where = {
            attendanceDate: { gte: startDate, lte: endDate },
        };
        const items = await this.prisma.attendanceSession.findMany({
            where,
            include: { pauses: true },
            orderBy: [{ attendanceDate: 'desc' }, { checkInAt: 'desc' }],
        });
        const approvedExceptions = await this.prisma.attendanceException.findMany({
            where: {
                attendanceDate: { gte: startDate, lte: endDate },
                type: client_1.ExceptionType.WORKING_TIME_ADJUSTMENT,
                status: client_1.ExceptionStatus.APPROVED,
            },
        });
        const adjustmentsByKey = new Map();
        for (const ex of approvedExceptions) {
            const dStr = this.formatDateOnly(ex.attendanceDate);
            const key = `${ex.employeeId}_${dStr}`;
            const { seconds, reason } = this.extractAdjustmentFromException(ex);
            const prev = adjustmentsByKey.get(key) || { seconds: 0, reasons: [], exception: ex };
            prev.seconds += seconds;
            if (reason && !prev.reasons.includes(reason))
                prev.reasons.push(reason);
            adjustmentsByKey.set(key, prev);
        }
        const appliedKeys = new Set();
        const sessionDtos = items.map((s) => {
            const dStr = this.formatDateOnly(s.attendanceDate);
            const key = `${s.employeeId}_${dStr}`;
            let adj = 0;
            let reason;
            if (!appliedKeys.has(key)) {
                const dAdj = adjustmentsByKey.get(key);
                if (dAdj) {
                    adj = dAdj.seconds;
                    reason = dAdj.reasons.join('; ');
                    appliedKeys.add(key);
                }
            }
            return this.toSessionDto(s, s.pauses, new Date(), adj, reason);
        });
        for (const [key, dAdj] of adjustmentsByKey.entries()) {
            if (!appliedKeys.has(key) && dAdj.seconds > 0) {
                const [empId, dStr] = key.split('_');
                sessionDtos.push(this.createSynthesizedSpecialSession(empId, dStr, dAdj.exception, dAdj.seconds, dAdj.reasons.join('; ')));
            }
        }
        sessionDtos.sort((a, b) => {
            const dCompare = b.attendanceDate.localeCompare(a.attendanceDate);
            if (dCompare !== 0)
                return dCompare;
            return new Date(b.checkInAt).getTime() - new Date(a.checkInAt).getTime();
        });
        const total = sessionDtos.length;
        const isPaginated = typeof query.page === 'number' && typeof query.limit === 'number' && query.page > 0 && query.limit > 0 && !query.all;
        const isAll = !isPaginated || query.all === 'true' || query.all === '1' || (query.limit !== undefined && query.limit >= 1000);
        const paginatedItems = isAll ? sessionDtos : sessionDtos.slice((page - 1) * limit, page * limit);
        return {
            items: paginatedItems,
            page: isAll ? 1 : page,
            limit: isAll ? total : limit,
            total,
            totalPages: isAll ? 1 : Math.max(1, Math.ceil(total / limit)),
        };
    }
    async getHistory(employeeId, query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const endDate = query.endDate ? this.toDateOnly(new Date(query.endDate)) : this.toDateOnly(new Date());
        const startDate = query.startDate
            ? this.toDateOnly(new Date(query.startDate))
            : this.toDateOnly(new Date(endDate.getTime() - 29 * 24 * 60 * 60 * 1000));
        const ids = await this.resolveEmployeeIds(employeeId);
        const sessionWhere = {
            employeeId: { in: ids },
            attendanceDate: { gte: startDate, lte: endDate },
        };
        const items = await this.prisma.attendanceSession.findMany({
            where: sessionWhere,
            include: { pauses: true },
            orderBy: [{ attendanceDate: 'desc' }, { checkInAt: 'desc' }],
        });
        const approvedExceptions = await this.prisma.attendanceException.findMany({
            where: {
                employeeId: { in: ids },
                attendanceDate: { gte: startDate, lte: endDate },
                type: client_1.ExceptionType.WORKING_TIME_ADJUSTMENT,
                status: client_1.ExceptionStatus.APPROVED,
            },
        });
        const adjustmentsByDate = new Map();
        for (const ex of approvedExceptions) {
            const dStr = this.formatDateOnly(ex.attendanceDate);
            const { seconds, reason } = this.extractAdjustmentFromException(ex);
            const prev = adjustmentsByDate.get(dStr) || { seconds: 0, reasons: [], exception: ex };
            prev.seconds += seconds;
            if (reason && !prev.reasons.includes(reason))
                prev.reasons.push(reason);
            adjustmentsByDate.set(dStr, prev);
        }
        const appliedDates = new Set();
        const sessionDtos = items.map((s) => {
            const dStr = this.formatDateOnly(s.attendanceDate);
            let adj = 0;
            let reason;
            if (!appliedDates.has(dStr)) {
                const dAdj = adjustmentsByDate.get(dStr);
                if (dAdj) {
                    adj = dAdj.seconds;
                    reason = dAdj.reasons.join('; ');
                    appliedDates.add(dStr);
                }
            }
            return this.toSessionDto(s, s.pauses, new Date(), adj, reason);
        });
        for (const [dStr, dAdj] of adjustmentsByDate.entries()) {
            if (!appliedDates.has(dStr) && dAdj.seconds > 0) {
                sessionDtos.push(this.createSynthesizedSpecialSession(ids[0] || employeeId, dStr, dAdj.exception, dAdj.seconds, dAdj.reasons.join('; ')));
            }
        }
        sessionDtos.sort((a, b) => {
            const dCompare = b.attendanceDate.localeCompare(a.attendanceDate);
            if (dCompare !== 0)
                return dCompare;
            return new Date(b.checkInAt).getTime() - new Date(a.checkInAt).getTime();
        });
        const total = sessionDtos.length;
        const isPaginated = typeof query.page === 'number' && typeof query.limit === 'number' && query.page > 0 && query.limit > 0 && !query.all;
        const isAll = !isPaginated || query.all === 'true' || query.all === '1' || (query.limit !== undefined && query.limit >= 1000);
        const paginatedItems = isAll ? sessionDtos : sessionDtos.slice((page - 1) * limit, page * limit);
        return {
            items: paginatedItems,
            page: isAll ? 1 : page,
            limit: isAll ? total : limit,
            total,
            totalPages: isAll ? 1 : Math.max(1, Math.ceil(total / limit)),
        };
    }
    async getById(employeeId, sessionId) {
        const session = await this.prisma.attendanceSession.findUnique({
            where: { id: sessionId },
            include: { pauses: true },
        });
        const ids = await this.resolveEmployeeIds(employeeId);
        if (!session || !ids.includes(session.employeeId)) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.SESSION_NOT_FOUND, 'Attendance session not found', common_1.HttpStatus.NOT_FOUND);
        }
        const approvedExceptions = await this.prisma.attendanceException.findMany({
            where: {
                employeeId: session.employeeId,
                attendanceDate: session.attendanceDate,
                type: client_1.ExceptionType.WORKING_TIME_ADJUSTMENT,
                status: client_1.ExceptionStatus.APPROVED,
            },
        });
        let totalAdjustmentSeconds = 0;
        const reasons = [];
        for (const ex of approvedExceptions) {
            const { seconds, reason } = this.extractAdjustmentFromException(ex);
            totalAdjustmentSeconds += seconds;
            if (reason && !reasons.includes(reason))
                reasons.push(reason);
        }
        return this.toSessionDto(session, session.pauses, new Date(), totalAdjustmentSeconds, reasons.join('; '));
    }
    async runAutoCheckoutSweep(batchSize, now = new Date()) {
        const policy = await this.policyProvider.getPolicy('');
        if (!policy.autoCheckoutEnabled) {
            return { processed: 0, skipped: 0 };
        }
        const expiredPaused = await this.prisma.attendanceSession.findMany({
            where: { status: enums_1.AttendanceStatus.PAUSED, currentGraceDeadline: { lte: now } },
            include: { pauses: true },
            take: batchSize,
        });
        const activeSessions = await this.prisma.attendanceSession.findMany({
            where: {
                status: { in: [enums_1.AttendanceStatus.WORKING, enums_1.AttendanceStatus.PAUSED] },
            },
            include: { pauses: true },
            take: batchSize,
        });
        const sessionMap = new Map();
        for (const s of expiredPaused) {
            sessionMap.set(s.id, { session: s, targetCheckoutTime: s.currentGraceDeadline ?? now });
        }
        for (const s of activeSessions) {
            const midnightCutoff = this.getMidnightCutoffForSession(s.checkInAt);
            if (now.getTime() >= midnightCutoff.getTime()) {
                const existing = sessionMap.get(s.id);
                if (!existing || (existing.targetCheckoutTime && midnightCutoff.getTime() < existing.targetCheckoutTime.getTime())) {
                    sessionMap.set(s.id, { session: s, targetCheckoutTime: midnightCutoff });
                }
            }
        }
        const pendingSessions = Array.from(sessionMap.values());
        let processed = 0;
        let skipped = 0;
        for (const item of pendingSessions) {
            try {
                const handled = await this.autoCheckoutOne(item.session, now, item.targetCheckoutTime);
                if (handled) {
                    processed += 1;
                }
                else {
                    skipped += 1;
                }
            }
            catch (error) {
                this.logger.error(`Auto-checkout failed for sessionId=${item.session.id}: ${error.message}`);
            }
        }
        if (processed > 0 || skipped > 0) {
            this.logger.log(`Auto-checkout sweep: processed=${processed} skipped=${skipped}`);
        }
        return { processed, skipped };
    }
    async autoCheckoutOne(session, now, targetCheckoutTime) {
        const isPaused = session.status === enums_1.AttendanceStatus.PAUSED;
        let checkoutAt = targetCheckoutTime ?? (isPaused ? (session.currentGraceDeadline ?? now) : now);
        if (checkoutAt.getTime() > now.getTime()) {
            checkoutAt = now;
        }
        const openPause = session.pauses.find((p) => p.endedAt === null);
        const totalWorkingSeconds = this.workingTimeService.calculateWorkingSeconds({
            status: enums_1.AttendanceStatus.CHECKED_OUT,
            checkInAt: session.checkInAt,
            checkOutAt: checkoutAt,
            currentPauseStartedAt: null,
        }, session.pauses, checkoutAt);
        const isGraceExpired = isPaused && session.currentGraceDeadline && session.currentGraceDeadline.getTime() <= now.getTime();
        const checkoutReason = isGraceExpired ? enums_1.CheckoutReason.GEOFENCE_TIMEOUT : enums_1.CheckoutReason.SYSTEM_ACTION;
        return this.prisma.$transaction(async (tx) => {
            const { count } = await tx.attendanceSession.updateMany({
                where: { id: session.id, status: { in: [enums_1.AttendanceStatus.WORKING, enums_1.AttendanceStatus.PAUSED] } },
                data: {
                    status: enums_1.AttendanceStatus.CHECKED_OUT,
                    checkOutAt: checkoutAt,
                    checkoutType: enums_1.CheckoutType.AUTO,
                    checkoutReason,
                    totalWorkingSeconds,
                    currentPauseStartedAt: null,
                    currentGraceDeadline: null,
                },
            });
            if (count === 0) {
                return false;
            }
            if (openPause) {
                await tx.attendancePause.updateMany({
                    where: { id: openPause.id, endedAt: null },
                    data: {
                        endedAt: checkoutAt,
                        durationSeconds: Math.max(0, Math.round((checkoutAt.getTime() - openPause.startedAt.getTime()) / 1000)),
                        endReason: enums_1.PauseEndReason.AUTO_CHECKOUT,
                    },
                });
            }
            const clientEventId = `auto-checkout:${session.id}`;
            await tx.attendanceEvent.upsert({
                where: { clientEventId },
                update: {},
                create: {
                    attendanceSessionId: session.id,
                    employeeId: session.employeeId,
                    clientEventId,
                    eventType: enums_1.AttendanceEventType.AUTO_CHECKOUT,
                    eventTime: checkoutAt,
                    source: enums_1.AttendanceEventSource.SYSTEM,
                },
            });
            this.logger.log(`AUTO_CHECKOUT employeeId=${session.employeeId} sessionId=${session.id} reason=${checkoutReason} checkoutAt=${checkoutAt.toISOString()}`);
            return true;
        });
    }
    requireLocation(event) {
        if (!event.location) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.VALIDATION_FAILED, 'location is required for this event type', common_1.HttpStatus.BAD_REQUEST);
        }
        return event.location;
    }
    validateLocationAccuracy(location, policy) {
        if (location.isMocked === true) {
            this.logger.warn(`Security alert: check-in rejected due to mock/spoofed GPS provider detection`);
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.MOCK_LOCATION_DETECTED, 'Spoofed or mock GPS provider detected. Attendance check-in from mock locations is strictly prohibited.', common_1.HttpStatus.FORBIDDEN);
        }
        if (location.accuracyMeters !== undefined &&
            location.accuracyMeters > policy.minLocationAccuracyMeters) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.LOCATION_ACCURACY_TOO_LOW, `Location accuracy (${location.accuracyMeters}m) exceeds the allowed maximum (${policy.minLocationAccuracyMeters}m)`, common_1.HttpStatus.UNPROCESSABLE_ENTITY);
        }
    }
    determineCheckInStatus(effectiveTime, policy) {
        const minutesOfDay = this.getLocalMinutesOfDay(effectiveTime);
        const windowStart = this.toMinutes(policy.checkInStartTime || '06:00');
        const lateCutoff = this.toMinutes(policy.lateCutoffTime || '10:00');
        if (minutesOfDay < windowStart) {
            return enums_1.CheckInStatus.EXCEPTION;
        }
        if (minutesOfDay > lateCutoff) {
            return enums_1.CheckInStatus.LATE;
        }
        return enums_1.CheckInStatus.ON_TIME;
    }
    getLocalMinutesOfDay(date, timeZone = process.env.APP_TIMEZONE || 'Asia/Kolkata') {
        try {
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone,
                hour: 'numeric',
                minute: 'numeric',
                hour12: false,
            });
            const parts = formatter.formatToParts(date);
            const hourPart = parts.find((p) => p.type === 'hour')?.value ?? '0';
            const minutePart = parts.find((p) => p.type === 'minute')?.value ?? '0';
            const h = parseInt(hourPart, 10) % 24;
            const m = parseInt(minutePart, 10);
            return h * 60 + m;
        }
        catch {
            return date.getHours() * 60 + date.getMinutes();
        }
    }
    getMidnightCutoffForSession(checkInAt, timeZone = process.env.APP_TIMEZONE || 'Asia/Kolkata') {
        try {
            const formatter = new Intl.DateTimeFormat('en-CA', {
                timeZone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            });
            const [y, m, d] = formatter.format(checkInAt).split('-').map(Number);
            const nextDayDate = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0));
            const offsetParts = new Intl.DateTimeFormat('en-US', {
                timeZone,
                timeZoneName: 'longOffset',
            }).formatToParts(nextDayDate);
            const tzOffsetStr = offsetParts.find((p) => p.type === 'timeZoneName')?.value;
            let offsetMinutes = 330;
            if (tzOffsetStr) {
                const match = tzOffsetStr.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
                if (match) {
                    const sign = match[1] === '-' ? -1 : 1;
                    const hours = parseInt(match[2], 10);
                    const mins = match[3] ? parseInt(match[3], 10) : 0;
                    offsetMinutes = sign * (hours * 60 + mins);
                }
            }
            return new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0) - offsetMinutes * 60 * 1000);
        }
        catch {
            const nextDay = new Date(checkInAt);
            nextDay.setDate(nextDay.getDate() + 1);
            nextDay.setHours(0, 0, 0, 0);
            return nextDay;
        }
    }
    toMinutes(hhmm) {
        const [h, m] = hhmm.split(':').map(Number);
        return h * 60 + m;
    }
    toDateOnly(date) {
        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    }
    formatDateOnly(date) {
        return date.toISOString().slice(0, 10);
    }
    async findIdempotentReplay(clientEventId, expectedType) {
        const existing = await this.prisma.attendanceEvent.findUnique({ where: { clientEventId } });
        if (!existing)
            return null;
        if (existing.eventType !== expectedType) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.DUPLICATE_CLIENT_EVENT_ID, `clientEventId was already used for a different event type (${existing.eventType})`);
        }
        if (!existing.attendanceSessionId) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.CONFLICT, 'Original event has no associated session');
        }
        const session = await this.prisma.attendanceSession.findUniqueOrThrow({
            where: { id: existing.attendanceSessionId },
            include: { pauses: true },
        });
        return { session: this.toSessionDto(session, session.pauses), idempotentReplay: true };
    }
    toSyncResult(clientEventId, error) {
        if (error instanceof app_exception_1.AppException) {
            const body = error.getResponse();
            const status = body.code && INVALID_STATE_CODES.has(body.code)
                ? enums_1.SyncResultStatus.INVALID_STATE
                : enums_1.SyncResultStatus.REJECTED;
            return { clientEventId, status, message: body.message };
        }
        this.logger.error(`Unexpected error processing sync event ${clientEventId}: ${error.message}`);
        return { clientEventId, status: enums_1.SyncResultStatus.REJECTED, message: 'Unexpected server error' };
    }
    async getDayAdjustment(employeeIds, attendanceDate) {
        const approvedExceptions = await this.prisma.attendanceException.findMany({
            where: {
                employeeId: { in: employeeIds },
                attendanceDate,
                type: client_1.ExceptionType.WORKING_TIME_ADJUSTMENT,
                status: client_1.ExceptionStatus.APPROVED,
            },
        });
        let totalAdjustmentSeconds = 0;
        const reasons = [];
        for (const ex of approvedExceptions) {
            const { seconds, reason } = this.extractAdjustmentFromException(ex);
            totalAdjustmentSeconds += seconds;
            if (reason && !reasons.includes(reason))
                reasons.push(reason);
        }
        return {
            seconds: totalAdjustmentSeconds,
            reason: reasons.join('; '),
            exceptions: approvedExceptions,
        };
    }
    extractAdjustmentFromException(ex) {
        const meta = ex.metadata || {};
        const seconds = Number(meta.additionalSeconds) ||
            (Number(meta.additionalMinutes) ? Number(meta.additionalMinutes) * 60 : 0) ||
            (Number(meta.additionalHours) ? Math.round(Number(meta.additionalHours) * 3600) : 0);
        return {
            seconds,
            reason: ex.reason || 'Special Condition Working Hours',
        };
    }
    createSynthesizedSpecialSession(employeeId, attendanceDate, exception, seconds, reason) {
        const dDate = new Date(attendanceDate);
        return {
            id: `special-${exception.id}`,
            employeeId,
            officeId: 'REMOTE',
            attendanceDate,
            status: enums_1.AttendanceStatus.CHECKED_OUT,
            checkInAt: exception.validFrom || dDate,
            checkOutAt: exception.validUntil || dDate,
            checkInStatus: enums_1.CheckInStatus.ON_TIME,
            currentPauseStartedAt: null,
            currentGraceDeadline: null,
            checkoutType: enums_1.CheckoutType.ADMIN,
            checkoutReason: enums_1.CheckoutReason.ADMIN_ACTION,
            regularWorkingSeconds: 0,
            specialConditionSeconds: seconds,
            hasSpecialCondition: true,
            specialConditionStatus: 'HR Approved',
            specialConditionReason: reason || exception.reason || 'Special Condition Working Hours',
            totalWorkingSeconds: seconds,
            totalPausedSeconds: 0,
            createdAt: exception.createdAt,
            updatedAt: exception.updatedAt,
        };
    }
    toSessionDto(session, pauses, now = new Date(), approvedAdjustmentSeconds = 0, specialConditionReason) {
        const regularWorkingSeconds = session.status === enums_1.AttendanceStatus.CHECKED_OUT
            ? session.totalWorkingSeconds
            : this.workingTimeService.calculateWorkingSeconds(session, pauses, now);
        const totalPausedSeconds = pauses.reduce((acc, p) => {
            const end = p.endedAt ? p.endedAt.getTime() : now.getTime();
            return acc + Math.max(0, Math.round((end - p.startedAt.getTime()) / 1000));
        }, 0);
        const specialConditionSeconds = Math.max(0, approvedAdjustmentSeconds);
        const hasSpecialCondition = specialConditionSeconds > 0;
        const totalWorkingSeconds = regularWorkingSeconds + specialConditionSeconds;
        return {
            id: session.id,
            employeeId: session.employeeId,
            officeId: session.officeId,
            attendanceDate: this.formatDateOnly(session.attendanceDate),
            status: session.status,
            checkInAt: session.checkInAt,
            checkOutAt: session.checkOutAt,
            checkInStatus: session.checkInStatus,
            currentPauseStartedAt: session.currentPauseStartedAt,
            currentGraceDeadline: session.currentGraceDeadline,
            checkoutType: session.checkoutType,
            checkoutReason: session.checkoutReason,
            regularWorkingSeconds,
            specialConditionSeconds,
            hasSpecialCondition,
            specialConditionStatus: hasSpecialCondition ? 'HR Approved' : undefined,
            specialConditionReason: specialConditionReason || undefined,
            totalWorkingSeconds,
            totalPausedSeconds,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
        };
    }
};
exports.AttendanceService = AttendanceService;
exports.AttendanceService = AttendanceService = AttendanceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(geofence_provider_interface_1.GEOFENCE_PROVIDER)),
    __param(3, (0, common_1.Inject)(employee_provider_interface_1.EMPLOYEE_PROVIDER)),
    __param(4, (0, common_1.Inject)(attendance_policy_provider_interface_1.ATTENDANCE_POLICY_PROVIDER)),
    __param(5, (0, common_1.Inject)(face_ai_provider_interface_1.FACE_AI_PROVIDER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        working_time_service_1.WorkingTimeService, Object, Object, Object, Object, notification_client_service_1.NotificationClientService])
], AttendanceService);
//# sourceMappingURL=attendance.service.js.map