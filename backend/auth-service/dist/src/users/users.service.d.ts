import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
export interface UserWithRolesAndPermissions {
    id: string;
    username: string;
    fullName: string | null;
    email: string;
    isActive: boolean;
    mustChangePassword: boolean;
    roles: string[];
    permissions: string[];
}
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    normalizeEmail(email: string): string;
    createUser(dto: CreateUserDto): Promise<UserResponseDto>;
    findByEmailForAuth(identifier: string): Promise<({
        userRoles: ({
            role: {
                rolePermissions: ({
                    permission: {
                        id: string;
                        name: string;
                        description: string | null;
                        createdAt: Date;
                        updatedAt: Date;
                    };
                } & {
                    roleId: string;
                    permissionId: string;
                })[];
            } & {
                id: string;
                name: string;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            roleId: string;
            userId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        username: string;
        email: string;
        passwordHash: string;
        fullName: string | null;
        isActive: boolean;
        mustChangePassword: boolean;
        lastLoginAt: Date | null;
    }) | null>;
    findActiveUserWithRolesAndPermissions(userId: string): Promise<UserWithRolesAndPermissions | null>;
    findById(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        username: string;
        email: string;
        passwordHash: string;
        fullName: string | null;
        isActive: boolean;
        mustChangePassword: boolean;
        lastLoginAt: Date | null;
    } | null>;
    listUsers(): Promise<UserResponseDto[]>;
    getUserOrThrow(userId: string): Promise<UserResponseDto>;
    setActiveStatus(userId: string, isActive: boolean): Promise<UserResponseDto>;
    updateUser(userId: string, dto: UpdateUserDto): Promise<UserResponseDto>;
    adminResetPassword(userId: string, temporaryPassword: string): Promise<void>;
    updateLastLogin(userId: string): Promise<void>;
    updatePasswordHash(userId: string, newPasswordHash: string): Promise<void>;
    private toRolesAndPermissions;
    deleteUser(id: string): Promise<void>;
    private toUserResponse;
}
