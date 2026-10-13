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
var EmployeeAuthGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeAuthGuard = void 0;
const crypto = __importStar(require("crypto"));
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const public_decorator_1 = require("../decorators/public.decorator");
let EmployeeAuthGuard = EmployeeAuthGuard_1 = class EmployeeAuthGuard {
    constructor(configService, reflector) {
        this.configService = configService;
        this.reflector = reflector;
        this.logger = new common_1.Logger(EmployeeAuthGuard_1.name);
        this.hasWarnedDevAuth = false;
    }
    canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const devAuth = this.configService.get('devAuth', { infer: true });
        const gatewayAuth = this.configService.get('gatewayAuth', { infer: true });
        if (devAuth.enabled) {
            if (!this.hasWarnedDevAuth) {
                this.logger.warn('ATTENDANCE_DEV_AUTH=true — identity headers are trusted WITHOUT verification. ' +
                    'This must never be enabled outside local development.');
                this.hasWarnedDevAuth = true;
            }
            const employeeId = request.headers[gatewayAuth.employeeIdHeader] ?? devAuth.defaultEmployeeId;
            const userId = request.headers[gatewayAuth.userIdHeader] ?? employeeId;
            const rolesHeader = request.headers[gatewayAuth.rolesHeader];
            const parseRolesHeader = (header, fallback = []) => {
                if (!header)
                    return fallback;
                const parsed = header
                    .replace(/[\[\]"'\\]/g, '')
                    .split(',')
                    .map((r) => r.trim())
                    .filter(Boolean);
                return parsed.length > 0 ? parsed : fallback;
            };
            const authContext = {
                employeeId,
                userId,
                roles: parseRolesHeader(rolesHeader, ['EMPLOYEE']),
                isDevAuth: true,
            };
            request.employeeAuth = authContext;
            return true;
        }
        const providedSecret = request.headers[gatewayAuth.sharedSecretHeader];
        if (!gatewayAuth.sharedSecret || providedSecret !== gatewayAuth.sharedSecret) {
            throw new common_1.UnauthorizedException('Missing or invalid gateway credentials');
        }
        const signature = request.headers['x-gateway-signature'];
        const timestamp = request.headers['x-gateway-timestamp'];
        if (signature && timestamp) {
            const tsNum = parseInt(timestamp, 10);
            const now = Date.now();
            if (Math.abs(now - tsNum) > 300000) {
                throw new common_1.UnauthorizedException('Gateway request signature expired (potential replay attack)');
            }
            const targetUrl = request.originalUrl || request.url || '';
            const expectedSig = crypto
                .createHmac('sha256', gatewayAuth.sharedSecret)
                .update(`${targetUrl}:${timestamp}:${gatewayAuth.sharedSecret}`)
                .digest('hex');
            if (signature !== expectedSig) {
                throw new common_1.UnauthorizedException('Invalid HMAC gateway signature');
            }
        }
        const employeeId = request.headers[gatewayAuth.employeeIdHeader];
        const userId = request.headers[gatewayAuth.userIdHeader];
        const rolesHeader = request.headers[gatewayAuth.rolesHeader];
        if (!employeeId || !userId) {
            throw new common_1.UnauthorizedException('Missing authenticated identity headers');
        }
        const parseRolesHeader = (header, fallback = []) => {
            if (!header)
                return fallback;
            const parsed = header
                .replace(/[\[\]"'\\]/g, '')
                .split(',')
                .map((r) => r.trim())
                .filter(Boolean);
            return parsed.length > 0 ? parsed : fallback;
        };
        const authContext = {
            employeeId,
            userId,
            roles: parseRolesHeader(rolesHeader, []),
            isDevAuth: false,
        };
        request.employeeAuth = authContext;
        return true;
    }
};
exports.EmployeeAuthGuard = EmployeeAuthGuard;
exports.EmployeeAuthGuard = EmployeeAuthGuard = EmployeeAuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        core_1.Reflector])
], EmployeeAuthGuard);
//# sourceMappingURL=employee-auth.guard.js.map