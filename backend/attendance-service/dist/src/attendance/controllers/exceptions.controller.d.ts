import { ExceptionsService } from '../services/exceptions.service';
import { CreateExceptionDto } from '../dto/create-exception.dto';
import { ApproveExceptionDto } from '../dto/approve-exception.dto';
import { EmployeeAuthContext } from '../../common/interfaces/employee-auth-context.interface';
export declare class ExceptionsController {
    private readonly exceptionsService;
    constructor(exceptionsService: ExceptionsService);
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
    approveException(auth: EmployeeAuthContext, id: string, dto: ApproveExceptionDto): Promise<{
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
    deleteException(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
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
    listExceptions(employeeId?: string, status?: string, hrEmail?: string): Promise<{
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
}
