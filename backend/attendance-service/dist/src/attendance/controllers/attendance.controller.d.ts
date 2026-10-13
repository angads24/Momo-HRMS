import { AttendanceService } from '../services/attendance.service';
import { CheckInDto } from '../dto/check-in.dto';
import { CheckOutDto } from '../dto/check-out.dto';
import { GeofenceExitDto } from '../dto/geofence-exit.dto';
import { GeofenceReturnDto } from '../dto/geofence-return.dto';
import { SyncDto } from '../dto/sync.dto';
import { HistoryQueryDto } from '../dto/history-query.dto';
import { EmployeeAuthContext } from '../../common/interfaces/employee-auth-context.interface';
export declare class AttendanceController {
    private readonly attendanceService;
    constructor(attendanceService: AttendanceService);
    checkIn(employee: EmployeeAuthContext, dto: CheckInDto): Promise<import("../dto/attendance-session-response.dto").AttendanceSessionResponseDto>;
    checkOut(employee: EmployeeAuthContext, dto: CheckOutDto): Promise<import("../dto/attendance-session-response.dto").AttendanceSessionResponseDto>;
    geofenceExit(employee: EmployeeAuthContext, dto: GeofenceExitDto): Promise<import("../dto/attendance-session-response.dto").AttendanceSessionResponseDto>;
    geofenceReturn(employee: EmployeeAuthContext, dto: GeofenceReturnDto): Promise<import("../dto/attendance-session-response.dto").AttendanceSessionResponseDto>;
    sync(employee: EmployeeAuthContext, dto: SyncDto): Promise<import("../dto/attendance-session-response.dto").SyncResponseDto>;
    allToday(): Promise<import("../dto/attendance-session-response.dto").TodayAttendanceResponseDto>;
    allHistory(query: HistoryQueryDto): Promise<import("../dto/attendance-session-response.dto").PaginatedHistoryResponseDto>;
    private isHrOrAdmin;
    today(employee: EmployeeAuthContext, all?: string, employeeIdQuery?: string): Promise<import("../dto/attendance-session-response.dto").TodayAttendanceResponseDto>;
    history(employee: EmployeeAuthContext, query: HistoryQueryDto, all?: string, employeeIdQuery?: string): Promise<import("../dto/attendance-session-response.dto").PaginatedHistoryResponseDto>;
    getById(employee: EmployeeAuthContext, sessionId: string): Promise<import("../dto/attendance-session-response.dto").AttendanceSessionResponseDto>;
}
