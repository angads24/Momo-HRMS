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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const argon2 = __importStar(require("argon2"));
const prisma_service_1 = require("../prisma/prisma.service");
const users_service_1 = require("../users/users.service");
const token_service_1 = require("./token.service");
let AuthService = class AuthService {
    constructor(prisma, usersService, tokenService) {
        this.prisma = prisma;
        this.usersService = usersService;
        this.tokenService = tokenService;
    }
    async login(dto, metadata) {
        const user = await this.usersService.findByEmailForAuth(dto.email);
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const passwordValid = await argon2.verify(user.passwordHash, dto.password);
        if (!passwordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const roles = user.userRoles.map((ur) => ur.role.name);
        const permissionSet = new Set();
        for (const userRole of user.userRoles) {
            for (const rp of userRole.role.rolePermissions) {
                permissionSet.add(rp.permission.name);
            }
        }
        const permissions = Array.from(permissionSet);
        await this.usersService.updateLastLogin(user.id);
        const { accessToken, refreshToken } = await this.issueTokenPair(user.id, roles, metadata);
        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                fullName: user.fullName,
                roles,
                permissions,
                mustChangePassword: user.mustChangePassword,
            },
        };
    }
    async refresh(rawRefreshToken, metadata) {
        let payload;
        try {
            payload = this.tokenService.verifyRefreshToken(rawRefreshToken);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        const tokenHash = this.tokenService.hashToken(rawRefreshToken);
        const session = await this.prisma.refreshTokenSession.findUnique({
            where: { tokenHash },
        });
        if (!session || session.userId !== payload.sub) {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        if (session.revokedAt) {
            throw new common_1.UnauthorizedException('Session has been revoked');
        }
        if (session.expiresAt.getTime() < Date.now()) {
            throw new common_1.UnauthorizedException('Refresh token has expired');
        }
        const user = await this.usersService.findActiveUserWithRolesAndPermissions(payload.sub);
        if (!user) {
            throw new common_1.UnauthorizedException('Account is not active');
        }
        await this.prisma.refreshTokenSession.update({
            where: { id: session.id },
            data: { revokedAt: new Date() },
        });
        const { accessToken, refreshToken } = await this.issueTokenPair(user.id, user.roles, metadata);
        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                fullName: user.fullName,
                roles: user.roles,
                permissions: user.permissions,
                mustChangePassword: user.mustChangePassword,
            },
        };
    }
    async logout(rawRefreshToken) {
        const tokenHash = this.tokenService.hashToken(rawRefreshToken);
        await this.prisma.refreshTokenSession.updateMany({
            where: { tokenHash, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
    async logoutAll(userId) {
        await this.prisma.refreshTokenSession.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
    async changePassword(userId, dto) {
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('Account not found');
        }
        const currentValid = await argon2.verify(user.passwordHash, dto.currentPassword);
        if (!currentValid) {
            throw new common_1.UnauthorizedException('Current password is incorrect');
        }
        const newPasswordHash = await argon2.hash(dto.newPassword);
        await this.usersService.updatePasswordHash(userId, newPasswordHash);
        await this.logoutAll(userId);
    }
    async setInitialPassword(userId, newPassword) {
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('Account not found');
        }
        if (!user.mustChangePassword) {
            throw new common_1.ForbiddenException('A password has already been set. Use change-password instead.');
        }
        const newPasswordHash = await argon2.hash(newPassword);
        await this.usersService.updatePasswordHash(userId, newPasswordHash);
    }
    async issueTokenPair(userId, roles, metadata) {
        const accessToken = this.tokenService.signAccessToken({ sub: userId, roles });
        const { token: refreshToken } = this.tokenService.signRefreshToken(userId);
        await this.prisma.refreshTokenSession.create({
            data: {
                userId,
                tokenHash: this.tokenService.hashToken(refreshToken),
                expiresAt: this.tokenService.getRefreshExpiryDate(),
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent,
            },
        });
        return { accessToken, refreshToken };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        users_service_1.UsersService,
        token_service_1.TokenService])
], AuthService);
//# sourceMappingURL=auth.service.js.map