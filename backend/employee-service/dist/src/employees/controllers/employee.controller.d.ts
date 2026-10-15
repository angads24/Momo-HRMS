import { Request, Response } from 'express';
import { EmployeeService } from '../services/employee.service';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { AssignOfficeDto } from '../dto/assign-office.dto';
import { EmployeeQueryDto } from '../dto/employee-query.dto';
interface UploadedMulterFile {
    buffer: Buffer;
    originalname?: string;
    mimetype?: string;
    size?: number;
}
export declare class EmployeeController {
    private readonly employeeService;
    constructor(employeeService: EmployeeService);
    createEmployee(dto: CreateEmployeeDto): Promise<any>;
    listEmployees(query: EmployeeQueryDto): Promise<{
        items: any[];
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    }>;
    getMetrics(): Promise<{
        employeeCount: number;
        departmentCount: number;
    }>;
    getHrStaff(): Promise<{
        id: string;
        name: string;
        email: string;
        role?: string;
    }[]>;
    getMe(req: Request): Promise<any>;
    updateMe(req: Request, dto: UpdateEmployeeDto): Promise<any>;
    updatePhoto(req: Request, body: {
        photo: string;
    }): Promise<any>;
    getAttendanceToken(req: Request, body?: {
        photo?: string;
    }): Promise<{
        success: boolean;
        token: string;
        employeeCode: any;
    }>;
    resolveIdentifier(identifier?: string): Promise<{
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
    downloadTemplate(res: Response): Promise<Response<any, Record<string, any>>>;
    validateImport(file?: UploadedMulterFile): Promise<import("../dto/import-employee.dto").ValidationSummary>;
    executeImport(file?: UploadedMulterFile, provisionAccounts?: string): Promise<import("../dto/import-employee.dto").ImportExecutionResult>;
    getEmployeeProfile(id: string): Promise<{
        employee: any;
        devices: never[];
        faceTemplate: {
            hasActiveReference: boolean;
            status: string | null;
        };
    }>;
    getEmployeeById(id: string): Promise<any>;
    getEmployeeByUserId(userId: string): Promise<any>;
    updateEmployeePut(id: string, dto: UpdateEmployeeDto): Promise<any>;
    updateEmployee(id: string, dto: UpdateEmployeeDto): Promise<any>;
    updateStatus(id: string, body: {
        status: any;
    }): Promise<any>;
    updateRole(id: string, body: {
        roleId: string;
    }): Promise<any>;
    deleteEmployee(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    assignOffice(id: string, dto: AssignOfficeDto): Promise<{
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
    checkOfficeAssignment(id: string, officeId: string): Promise<{
        isAssigned: boolean;
        employeeId: string;
        officeId: string;
    }>;
    resendCredentials(id: string): Promise<{
        success: boolean;
        delivered: any;
        mode: any;
        message: any;
        deliveredTo: any;
        temporaryPassword: string;
    }>;
    testSmtpPost(body: {
        toEmail?: string;
    }): Promise<{
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
    testSmtpGet(toEmail?: string): Promise<{
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
    registerDevice(id: string, body: any): Promise<{
        id: string;
        employeeId: string;
        deviceName: any;
        deviceType: any;
        deviceIdentifier: any;
        status: string;
        createdAt: string;
    }>;
}
export {};
