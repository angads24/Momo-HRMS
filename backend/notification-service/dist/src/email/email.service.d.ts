import { OnModuleInit } from '@nestjs/common';
export interface SendSpecialHoursEmailOptions {
    hrEmail: string;
    employeeName: string;
    employeeId: string;
    employeeEmail?: string;
    attendanceDate: string;
    additionalHours: number;
    reason: string;
    exceptionId: string;
}
export interface SendDecisionEmailOptions {
    employeeEmail: string;
    employeeName: string;
    status: 'APPROVED' | 'REJECTED';
    attendanceDate: string;
    additionalHours?: number;
    comment?: string;
}
export declare class EmailService implements OnModuleInit {
    private readonly logger;
    private transporter;
    readonly isConfigured: boolean;
    private readonly host;
    private readonly port;
    private readonly secure;
    private readonly user;
    private readonly pass;
    private readonly fromName;
    private readonly fromEmail;
    private readonly frontendUrl;
    constructor();
    onModuleInit(): Promise<void>;
    get fromAddress(): string;
    sendSpecialWorkingHoursEmail(options: SendSpecialHoursEmailOptions): Promise<boolean>;
    sendDecisionEmail(options: SendDecisionEmailOptions): Promise<boolean>;
}
