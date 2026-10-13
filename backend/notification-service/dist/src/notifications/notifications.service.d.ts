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
    remove(id: string): Promise<{
        success: boolean;
    }>;
}
