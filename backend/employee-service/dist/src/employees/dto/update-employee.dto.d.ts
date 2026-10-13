import { EmploymentStatus } from '@prisma/client';
export declare class UpdateEmployeeDto {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    departmentId?: string;
    designationId?: string;
    employmentStatus?: EmploymentStatus;
    dateOfJoining?: string;
    userId?: string;
    personalEmail?: string;
    jobTitle?: string;
    roleId?: string;
    primaryOfficeId?: string;
    officeLocationId?: string;
    officeLocationName?: string;
    officeIds?: string[];
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    permanentAddress?: string;
    alternatePhone?: string;
    emergencyContactName?: string;
    emergencyContactRelation?: string;
    emergencyContactPhone?: string;
    isOnboarded?: boolean;
    profilePhotoUrl?: string;
}
