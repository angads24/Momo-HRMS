import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { AssignOfficeDto } from '../dto/assign-office.dto';
import { EmployeeQueryDto } from '../dto/employee-query.dto';
import { EmploymentStatus } from '@prisma/client';
import { EmailService } from '../../email/email.service';
import { ImportExecutionResult, ValidationSummary } from '../dto/import-employee.dto';
export declare class EmployeeService implements OnModuleInit {
    private readonly prisma;
    private readonly emailService;
    private readonly logger;
    private officesCache;
    private lastOfficeFetch;
    constructor(prisma: PrismaService, emailService: EmailService);
    onModuleInit(): Promise<void>;
    ensureOfficesCache(force?: boolean): Promise<void>;
    refreshOfficesCache(): Promise<void>;
    private getOfficeDetails;
    createEmployee(dto: CreateEmployeeDto): Promise<any>;
    updateEmployee(id: string, dto: UpdateEmployeeDto): Promise<any>;
    getEmployeeMe(userId?: string, email?: string, employeeId?: string): Promise<any>;
    updateEmployeeMe(userId: string | undefined, email: string | undefined, employeeId: string | undefined, dto: UpdateEmployeeDto): Promise<any>;
    generateAttendanceToken(employeeCode: string): string;
    deleteEmployee(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    listEmployees(query: EmployeeQueryDto): Promise<{
        items: any[];
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    }>;
    getDashboardMetrics(): Promise<{
        employeeCount: number;
        departmentCount: number;
    }>;
    getEmployeeById(idOrCode: string): Promise<any>;
    getEmployeeProfile(idOrCode: string): Promise<{
        employee: any;
        devices: never[];
        faceTemplate: {
            hasActiveReference: boolean;
            status: string | null;
        };
    }>;
    updateEmployeeStatus(id: string, status: EmploymentStatus): Promise<any>;
    getEmployeeByUserId(userId: string): Promise<any>;
    resendCredentials(idOrCode: string): Promise<{
        success: boolean;
        delivered: any;
        mode: any;
        message: any;
        deliveredTo: any;
        temporaryPassword: string;
    }>;
    private generateStrongTemporaryPassword;
    private syncCredentialsToAuthService;
    resolveIdentifier(identifier: string): Promise<{
        found: boolean;
        officialEmail?: undefined;
        personalEmail?: undefined;
        username?: undefined;
        employeeCode?: undefined;
        firstName?: undefined;
        lastName?: undefined;
    } | {
        found: boolean;
        officialEmail: string;
        personalEmail: string | null;
        username: string;
        employeeCode: string;
        firstName: string;
        lastName: string;
    }>;
    testSmtp(toEmail?: string): Promise<{
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
    private formatEmployee;
    assignOffice(employeeIdOrCode: string, dto: AssignOfficeDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        officeId: string;
        isPrimary: boolean;
        effectiveFrom: Date;
        effectiveTo: Date | null;
        isActive: boolean;
    }>;
    removeOfficeAssignment(assignmentId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        officeId: string;
        isPrimary: boolean;
        effectiveFrom: Date;
        effectiveTo: Date | null;
        isActive: boolean;
    }>;
    isAssignedToOffice(employeeIdOrCode: string, officeId: string): Promise<boolean>;
    getImportTemplateCsv(): string;
    validateImportFile(buffer: Buffer): Promise<ValidationSummary>;
    executeImportFile(buffer: Buffer, provisionAccounts?: boolean): Promise<ImportExecutionResult>;
    private parseCsvRows;
    private parseCsvLine;
    private normalizeHeader;
    getHrStaff(): Promise<Array<{
        id: string;
        name: string;
        email: string;
        role?: string;
    }>>;
}
