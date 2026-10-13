import { Observable } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { SseService } from './sse.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
export declare class NotificationsController {
    private readonly notificationsService;
    private readonly sseService;
    constructor(notificationsService: NotificationsService, sseService: SseService);
    send(dto: CreateNotificationDto): Promise<{
        type: string;
        title: string;
        recipientId: string;
        recipientType: string;
        body: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        isRead: boolean;
        id: string;
        readAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAll(query: QueryNotificationsDto): Promise<{
        items: {
            type: string;
            title: string;
            recipientId: string;
            recipientType: string;
            body: string;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            isRead: boolean;
            id: string;
            readAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
        unreadCount: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getUnreadCount(recipientId?: string, email?: string, role?: string): Promise<{
        count: number;
    }>;
    stream(recipientId: string, email?: string): Observable<MessageEvent>;
    markAsRead(id: string): Promise<{
        type: string;
        title: string;
        recipientId: string;
        recipientType: string;
        body: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        isRead: boolean;
        id: string;
        readAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    markAllAsRead(recipientId?: string, email?: string, role?: string, body?: any): Promise<{
        updated: number;
    }>;
    remove(id: string): Promise<{
        success: boolean;
    }>;
}
