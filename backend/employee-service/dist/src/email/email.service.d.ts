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
    hrPortalEmail?: string;
    hrPortalPassword?: string;
}
export interface CredentialDeliveryResult {
    delivered: boolean;
    mode: 'brevo' | 'resend' | 'smtp' | 'console' | 'failed';
    message: string;
    deliveredTo: string;
}
export declare class EmailService implements OnModuleInit {
    private readonly config;
    private readonly logger;
    private transporter;
    readonly isConfigured: boolean;
    private readonly brevoApiKey;
    private readonly resendApiKey;
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
    private sendViaBrevo;
    private sendViaResend;
    sendCredentialEmail(options: SendCredentialEmailOptions): Promise<CredentialDeliveryResult>;
    sendTestEmail(toEmail?: string): Promise<{
        success: boolean;
        provider: string;
        recipient: string;
        data: any;
        message: string;
        error?: undefined;
        configured?: undefined;
        messageId?: undefined;
    } | {
        success: boolean;
        provider: string;
        error: any;
        recipient?: undefined;
        data?: undefined;
        message?: undefined;
        configured?: undefined;
        messageId?: undefined;
    } | {
        success: boolean;
        error: string;
        configured: boolean;
        provider?: undefined;
        recipient?: undefined;
        data?: undefined;
        message?: undefined;
        messageId?: undefined;
    } | {
        success: boolean;
        messageId: string;
        recipient: string;
        configured: boolean;
        message: string;
        provider?: undefined;
        data?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        recipient: string;
        configured: boolean;
        provider?: undefined;
        data?: undefined;
        message?: undefined;
        messageId?: undefined;
    }>;
}
