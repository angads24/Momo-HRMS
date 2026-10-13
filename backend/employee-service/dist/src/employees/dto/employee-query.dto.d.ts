import { EmploymentStatus } from '@prisma/client';
export declare class EmployeeQueryDto {
    page?: number;
    limit?: number;
    departmentId?: string;
    status?: EmploymentStatus;
    officeId?: string;
    search?: string;
}
