import { PrismaService } from '../database/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { SseService } from './sse.service';
import { EmailService } from '../email/email.service';
export declare class NotificationsService {
    private readonly prisma;
    private readonly sseService;
    private readonly emailService;
    private readonly logger;
    constructor(prisma: PrismaService, sseService: SseService, emailService: EmailService);
    create(dto: CreateNotificationDto): Promise<{
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
    private buildRecipientWhere;
    getDismissedIds(userId?: string): Promise<string[]>;
    findAll(query: QueryNotificationsDto, callerUserId?: string): Promise<{
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
    getUnreadCount(recipientId?: string, email?: string, role?: string, callerUserId?: string): Promise<{
        count: number;
    }>;
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
    markAllAsRead(recipientId?: string, email?: string, role?: string): Promise<{
        updated: number;
    }>;
    remove(id: string, userId?: string, hardDelete?: boolean): Promise<{
        success: boolean;
        mode: string;
    }>;
}
