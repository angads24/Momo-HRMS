import { Request } from 'express';
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
    createNotification(dto: CreateNotificationDto): Promise<{
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
    findAll(query: QueryNotificationsDto, req: Request): Promise<{
        items: {
            recipientId: any;
            recipientDisplay: string;
            recipientName: string;
            from: any;
            to: string;
            metadata: Record<string, any>;
            type: string;
            title: string;
            recipientType: string;
            body: string;
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
    getUnreadCount(recipientId?: string, email?: string, role?: string, req?: Request): Promise<{
        count: number;
    }>;
    stream(recipientId?: string, email?: string, req?: Request): Observable<MessageEvent>;
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
    markAllAsRead(recipientId?: string, email?: string, role?: string, body?: any, req?: Request): Promise<{
        updated: number;
    }>;
    remove(id: string, hard?: string, queryUserId?: string, req?: Request): Promise<{
        success: boolean;
        mode: string;
    }>;
}
