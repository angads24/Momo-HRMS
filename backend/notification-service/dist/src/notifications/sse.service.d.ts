import { Observable } from 'rxjs';
export interface SseNotificationEvent {
    recipientId: string;
    recipientType: string;
    notification: any;
}
export declare class SseService {
    private readonly logger;
    private readonly eventStream$;
    emitNotification(event: SseNotificationEvent): void;
    getRecipientStream(recipientId: string, email?: string): Observable<MessageEvent>;
}
