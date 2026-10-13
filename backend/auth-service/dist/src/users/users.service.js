"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const argon2 = __importStar(require("argon2"));
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    normalizeEmail(email) {
        return email.trim().toLowerCase();
    }
    async createUser(dto) {
        const normalizedEmail = this.normalizeEmail(dto.email);
        const [existingEmail, existingUsername] = await Promise.all([
            this.prisma.user.findUnique({ where: { email: normalizedEmail } }),
            this.prisma.user.findUnique({ where: { username: dto.username } }),
        ]);
        if (existingEmail) {
            throw new common_1.ConflictException('A user with this email already exists');
        }
        if (existingUsername) {
            throw new common_1.ConflictException('A user with this username already exists');
        }
        const roles = await this.prisma.role.findMany({ where: { name: { in: dto.roles } } });
        const foundRoleNames = new Set(roles.map((role) => role.name));
        const missingRoles = dto.roles.filter((name) => !foundRoleNames.has(name));
        if (missingRoles.length > 0) {
            throw new common_1.NotFoundException(`Unknown role(s): ${missingRoles.join(', ')}`);
        }
        const passwordHash = await argon2.hash(dto.password);
        const user = await this.prisma.user.create({
            data: {
                username: dto.username,
                email: normalizedEmail,
                fullName: dto.fullName,
                passwordHash,
                isActive: true,
                mustChangePassword: dto.mustChangePassword ?? false,
                userRoles: {
                    create: roles.map((role) => ({ roleId: role.id })),
                },
            },
            include: { userRoles: { include: { role: true } } },
        });
        return this.toUserResponse(user);
    }
    async findByEmailForAuth(identifier) {
        const trimmed = identifier.trim();
        const normalizedEmail = this.normalizeEmail(trimmed);
        return this.prisma.user.findFirst({
            where: {
                OR: [{ email: normalizedEmail }, { username: trimmed }],
            },
            include: {
                userRoles: {
                    include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
                },
            },
        });
    }
    async findActiveUserWithRolesAndPermissions(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                userRoles: {
                    include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
                },
            },
        });
        if (!user || !user.isActive) {
            return null;
        }
        return this.toRolesAndPermissions(user);
    }
    async findById(userId) {
        return this.prisma.user.findUnique({ where: { id: userId } });
    }
    async listUsers() {
        const users = await this.prisma.user.findMany({
            include: { userRoles: { include: { role: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return users.map((user) => this.toUserResponse(user));
    }
    async getUserOrThrow(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { userRoles: { include: { role: true } } },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return this.toUserResponse(user);
    }
    async setActiveStatus(userId, isActive) {
        const existing = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!existing) {
            throw new common_1.NotFoundException('User not found');
        }
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: { isActive },
            include: { userRoles: { include: { role: true } } },
        });
        return this.toUserResponse(user);
    }
    async updateUser(userId, dto) {
        const existing = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!existing) {
            throw new common_1.NotFoundException('User not found');
        }
        const data = {};
        if (dto.fullName !== undefined) {
            data.fullName = dto.fullName;
        }
        if (dto.email !== undefined) {
            const normalizedEmail = this.normalizeEmail(dto.email);
            if (normalizedEmail !== existing.email) {
                const emailTaken = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
                if (emailTaken) {
                    throw new common_1.ConflictException('A user with this email already exists');
                }
            }
            data.email = normalizedEmail;
        }
        if (dto.roles) {
            const roles = await this.prisma.role.findMany({ where: { name: { in: dto.roles } } });
            const foundRoleNames = new Set(roles.map((role) => role.name));
            const missingRoles = dto.roles.filter((name) => !foundRoleNames.has(name));
            if (missingRoles.length > 0) {
                throw new common_1.NotFoundException(`Unknown role(s): ${missingRoles.join(', ')}`);
            }
            await this.prisma.userRole.deleteMany({ where: { userId } });
            await this.prisma.userRole.createMany({
                data: roles.map((role) => ({ userId, roleId: role.id })),
            });
        }
        const user = await this.prisma.user.update({
            where: { id: userId },
            data,
            include: { userRoles: { include: { role: true } } },
        });
        return this.toUserResponse(user);
    }
    async adminResetPassword(userId, temporaryPassword) {
        const existing = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!existing) {
            throw new common_1.NotFoundException('User not found');
        }
        const passwordHash = await argon2.hash(temporaryPassword);
        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash, mustChangePassword: true },
        });
        await this.prisma.refreshTokenSession.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
    async updateLastLogin(userId) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { lastLoginAt: new Date() },
        });
    }
    async updatePasswordHash(userId, newPasswordHash) {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash: newPasswordHash,
                mustChangePassword: false,
            },
        });
    }
    toRolesAndPermissions(user) {
        const roles = user.userRoles.map((userRole) => userRole.role.name);
        const permissionSet = new Set();
        for (const userRole of user.userRoles) {
            for (const rolePermission of userRole.role.rolePermissions) {
                permissionSet.add(rolePermission.permission.name);
            }
        }
        return {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            isActive: user.isActive,
            mustChangePassword: user.mustChangePassword,
            roles,
            permissions: Array.from(permissionSet),
        };
    }
    async deleteUser(id) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        await this.prisma.user.delete({ where: { id } });
    }
    toUserResponse(user) {
        return {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            isActive: user.isActive,
            mustChangePassword: user.mustChangePassword,
            roles: user.userRoles.map((userRole) => userRole.role.name),
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map