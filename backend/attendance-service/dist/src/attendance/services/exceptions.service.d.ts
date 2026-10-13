import { PrismaService } from '../../database/prisma.service';
import { CreateExceptionDto } from '../dto/create-exception.dto';
import { ApproveExceptionDto } from '../dto/approve-exception.dto';
import { ExceptionStatus } from '@prisma/client';
import { NotificationClientService } from '../../notifications/notification-client.service';
export declare class ExceptionsService {
    private readonly prisma;
    private readonly notificationClient;
    private readonly logger;
    constructor(prisma: PrismaService, notificationClient: NotificationClientService);
    createException(dto: CreateExceptionDto): Promise<{
        status: import(".prisma/client").$Enums.ExceptionStatus;
        type: import(".prisma/client").$Enums.ExceptionType;
        reason: string;
        employeeId: string;
        id: string;
        attendanceDate: Date;
        createdAt: Date;
        updatedAt: Date;
        attendanceSessionId: string | null;
        validFrom: Date;
        validUntil: Date;
        approvedByUserId: string | null;
        approvedAt: Date | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    approveException(id: string, approverUserId: string, dto: ApproveExceptionDto): Promise<{
        status: import(".prisma/client").$Enums.ExceptionStatus;
        type: import(".prisma/client").$Enums.ExceptionType;
        reason: string;
        employeeId: string;
        id: string;
        attendanceDate: Date;
        createdAt: Date;
        updatedAt: Date;
        attendanceSessionId: string | null;
        validFrom: Date;
        validUntil: Date;
        approvedByUserId: string | null;
        approvedAt: Date | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    getExceptions(employeeId?: string, status?: ExceptionStatus, hrEmail?: string): Promise<{
        status: import(".prisma/client").$Enums.ExceptionStatus;
        type: import(".prisma/client").$Enums.ExceptionType;
        reason: string;
        employeeId: string;
        id: string;
        attendanceDate: Date;
        createdAt: Date;
        updatedAt: Date;
        attendanceSessionId: string | null;
        validFrom: Date;
        validUntil: Date;
        approvedByUserId: string | null;
        approvedAt: Date | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    getExceptionById(id: string): Promise<{
        metadata: Record<string, any>;
        status: import(".prisma/client").$Enums.ExceptionStatus;
        type: import(".prisma/client").$Enums.ExceptionType;
        reason: string;
        employeeId: string;
        id: string;
        attendanceDate: Date;
        createdAt: Date;
        updatedAt: Date;
        attendanceSessionId: string | null;
        validFrom: Date;
        validUntil: Date;
        approvedByUserId: string | null;
        approvedAt: Date | null;
    }>;
    cancelException(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
