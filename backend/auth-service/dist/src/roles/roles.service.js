"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let RolesService = class RolesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        const roles = await this.prisma.role.findMany({
            include: { rolePermissions: { include: { permission: true } } },
            orderBy: { name: 'asc' },
        });
        return roles.map((role) => this.toRoleResponse(role));
    }
    async create(dto) {
        const existing = await this.prisma.role.findUnique({ where: { name: dto.name } });
        if (existing) {
            throw new common_1.ConflictException('A role with this name already exists');
        }
        const permissionIds = await this.resolvePermissionIds(dto.permissions ?? []);
        const role = await this.prisma.role.create({
            data: {
                name: dto.name,
                description: dto.description,
                rolePermissions: {
                    create: permissionIds.map((permissionId) => ({ permissionId })),
                },
            },
            include: { rolePermissions: { include: { permission: true } } },
        });
        return this.toRoleResponse(role);
    }
    async update(id, dto) {
        const existing = await this.prisma.role.findUnique({ where: { id } });
        if (!existing) {
            throw new common_1.NotFoundException('Role not found');
        }
        const data = {};
        if (dto.description !== undefined) {
            data.description = dto.description;
        }
        if (dto.permissions) {
            const permissionIds = await this.resolvePermissionIds(dto.permissions);
            await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
            await this.prisma.rolePermission.createMany({
                data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
            });
        }
        const role = await this.prisma.role.update({
            where: { id },
            data,
            include: { rolePermissions: { include: { permission: true } } },
        });
        return this.toRoleResponse(role);
    }
    async resolvePermissionIds(permissionNames) {
        if (permissionNames.length === 0) {
            return [];
        }
        const permissions = await this.prisma.permission.findMany({
            where: { name: { in: permissionNames } },
        });
        const found = new Set(permissions.map((permission) => permission.name));
        const missing = permissionNames.filter((name) => !found.has(name));
        if (missing.length > 0) {
            throw new common_1.NotFoundException(`Unknown permission(s): ${missing.join(', ')}`);
        }
        return permissions.map((permission) => permission.id);
    }
    toRoleResponse(role) {
        return {
            id: role.id,
            name: role.name,
            description: role.description,
            permissions: role.rolePermissions.map((rp) => rp.permission.name),
            createdAt: role.createdAt,
            updatedAt: role.updatedAt,
        };
    }
};
exports.RolesService = RolesService;
exports.RolesService = RolesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RolesService);
//# sourceMappingURL=roles.service.js.map