export declare enum ApproveStatus {
    APPROVED = "APPROVED",
    REJECTED = "REJECTED"
}
export declare class ApproveExceptionDto {
    status: ApproveStatus;
    comment?: string;
    approverName?: string;
    approverEmail?: string;
    employeeId?: string;
    attendanceDate?: string;
    additionalHours?: number;
    reason?: string;
    metadata?: Record<string, any>;
}
