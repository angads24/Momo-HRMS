export declare class UserResponseDto {
    id: string;
    username: string;
    fullName: string | null;
    email: string;
    isActive: boolean;
    mustChangePassword: boolean;
    roles: string[];
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
