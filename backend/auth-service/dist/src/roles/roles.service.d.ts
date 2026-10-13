import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
export declare class RolesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: string;
        name: string;
        description: string | null;
        permissions: string[];
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    create(dto: CreateRoleDto): Promise<{
        id: string;
        name: string;
        description: string | null;
        permissions: string[];
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, dto: UpdateRoleDto): Promise<{
        id: string;
        name: string;
        description: string | null;
        permissions: string[];
        createdAt: Date;
        updatedAt: Date;
    }>;
    private resolvePermissionIds;
    private toRoleResponse;
}
