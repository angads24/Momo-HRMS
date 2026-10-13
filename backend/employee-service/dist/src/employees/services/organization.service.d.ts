import { PrismaService } from '../../database/prisma.service';
import { CreateDepartmentDto } from '../dto/department.dto';
import { CreateDesignationDto } from '../dto/designation.dto';
export declare class OrganizationService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listDepartments(): Promise<{
        id: any;
        code: any;
        name: any;
        description: any;
        status: string;
        employeeCount: any;
        createdAt: any;
        updatedAt: any;
        designations: any;
    }[]>;
    createDepartment(dto: CreateDepartmentDto): Promise<{
        id: string;
        code: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    listDesignations(departmentId?: string): Promise<({
        department: {
            id: string;
            code: string;
            name: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
        } | null;
    } & {
        id: string;
        code: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        departmentId: string | null;
    })[]>;
    createDesignation(dto: CreateDesignationDto): Promise<{
        id: string;
        code: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        departmentId: string | null;
    }>;
    listRoles(): Promise<{
        id: string;
        name: string;
        description: string;
        employeeCount: number;
    }[]>;
}
