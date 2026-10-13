export declare enum ExceptionType {
    RECHECK_IN = "RECHECK_IN",
    EXTRA_GRACE = "EXTRA_GRACE",
    OFFICE_TRANSFER = "OFFICE_TRANSFER",
    WORKING_TIME_ADJUSTMENT = "WORKING_TIME_ADJUSTMENT"
}
export declare class CreateExceptionDto {
    employeeId: string;
    attendanceDate: string;
    type: ExceptionType;
    reason: string;
    attendanceSessionId?: string;
    additionalHours?: number;
    additionalMinutes?: number;
    hrEmail?: string;
    metadata?: Record<string, any>;
    validFrom?: string;
    validUntil?: string;
}
