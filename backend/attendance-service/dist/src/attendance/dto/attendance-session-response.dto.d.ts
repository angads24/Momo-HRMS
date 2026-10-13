import { AttendanceStatus, CheckInStatus, CheckoutReason, CheckoutType } from '../enums';
export declare class AttendanceSessionResponseDto {
    id: string;
    employeeId: string;
    officeId: string;
    attendanceDate: string;
    status: AttendanceStatus;
    checkInAt: Date;
    checkOutAt: Date | null;
    checkInStatus: CheckInStatus;
    currentPauseStartedAt: Date | null;
    currentGraceDeadline: Date | null;
    checkoutType: CheckoutType | null;
    checkoutReason: CheckoutReason | null;
    totalWorkingSeconds: number;
    totalPausedSeconds: number;
    regularWorkingSeconds?: number;
    specialConditionSeconds?: number;
    hasSpecialCondition?: boolean;
    specialConditionStatus?: string;
    specialConditionReason?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class SyncEventResultDto {
    clientEventId: string;
    status: string;
    message?: string;
}
export declare class SyncResponseDto {
    results: SyncEventResultDto[];
}
export declare class TodayAttendanceResponseDto {
    attendanceDate: string;
    sessions: AttendanceSessionResponseDto[];
    totalWorkingSecondsToday: number;
    totalRegularWorkingSecondsToday?: number;
    totalSpecialConditionSecondsToday?: number;
    hasActiveSession: boolean;
}
export declare class PaginatedHistoryResponseDto {
    items: AttendanceSessionResponseDto[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}
