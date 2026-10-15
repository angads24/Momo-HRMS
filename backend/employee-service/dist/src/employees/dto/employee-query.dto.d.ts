import { EmploymentStatus } from '@prisma/client';
export declare class EmployeeQueryDto {
    page?: number;
    limit?: number;
    all?: boolean | string;
    departmentId?: string;
    status?: EmploymentStatus;
    officeId?: string;
    search?: string;
}
