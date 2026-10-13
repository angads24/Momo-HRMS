import { ConfigService } from '@nestjs/config';
export interface SendNotificationPayload {
    recipientId: string;
    recipientType?: string;
    type: string;
    title: string;
    body: string;
    metadata?: Record<string, any>;
}
export declare class NotificationClientService {
    private readonly configService;
    private readonly logger;
    private readonly notificationServiceUrl;
    constructor(configService: ConfigService);
    sendNotification(payload: SendNotificationPayload): Promise<void>;
}
