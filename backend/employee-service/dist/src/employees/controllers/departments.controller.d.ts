import { OrganizationService } from '../services/organization.service';
import { CreateDepartmentDto } from '../dto/department.dto';
export declare class DepartmentsController {
    private readonly orgService;
    constructor(orgService: OrganizationService);
    listDepartments(limit?: number, status?: string): Promise<{
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
}
