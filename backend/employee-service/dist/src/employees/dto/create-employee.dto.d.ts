import { EmploymentStatus } from '@prisma/client';
export declare class CreateEmployeeDto {
    employeeCode: string;
    userId?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    departmentId?: string;
    designationId?: string;
    employmentStatus?: EmploymentStatus;
    dateOfJoining?: string;
    primaryOfficeId?: string;
    officeLocationId?: string;
    officeLocationName?: string;
    officeIds?: string[];
    personalEmail?: string;
    jobTitle?: string;
    roleId?: string;
    provisionAccount?: boolean;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    profilePhotoUrl?: string;
    employmentType?: string;
}
