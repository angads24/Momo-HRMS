import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export interface SendCredentialEmailOptions {
    toEmail: string;
    employeeName: string;
    officialEmail: string;
    username: string;
    temporaryPassword?: string;
    isPasswordReset?: boolean;
    roleName?: string;
}
export interface CredentialDeliveryResult {
    delivered: boolean;
    mode: 'smtp' | 'console';
    message: string;
    deliveredTo: string;
}
export declare class EmailService implements OnModuleInit {
    private readonly config;
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
    constructor(config: ConfigService);
    onModuleInit(): Promise<void>;
    get fromAddress(): string;
    sendCredentialEmail(options: SendCredentialEmailOptions): Promise<CredentialDeliveryResult>;
    sendTestEmail(toEmail?: string): Promise<{
        success: boolean;
        error: string;
        configured: boolean;
        messageId?: undefined;
        recipient?: undefined;
        message?: undefined;
    } | {
        success: boolean;
        messageId: string;
        recipient: string;
        configured: boolean;
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        recipient: string;
        configured: boolean;
        messageId?: undefined;
        message?: undefined;
    }>;
}
