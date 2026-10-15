export declare class EmailService {
    private readonly logger;
    sendSpecialWorkingHoursEmail(options: {
        hrEmail: string;
        employeeName: string;
        employeeId: string;
        employeeEmail?: string;
        attendanceDate: string;
        additionalHours: number;
        reason: string;
        exceptionId: string;
    }): Promise<void>;
    sendDecisionEmail(options: {
        employeeEmail: string;
        employeeName: string;
        status: 'APPROVED' | 'REJECTED';
        attendanceDate: string;
        additionalHours?: number;
        comment?: string;
    }): Promise<void>;
}
