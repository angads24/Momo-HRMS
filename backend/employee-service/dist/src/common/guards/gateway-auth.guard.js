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
exports.GatewayAuthGuard = void 0;
const crypto = require("crypto");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const public_decorator_1 = require("../decorators/public.decorator");
let GatewayAuthGuard = class GatewayAuthGuard {
    constructor(configService, reflector) {
        this.configService = configService;
        this.reflector = reflector;
    }
    canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        const devAuth = this.configService.get('devAuth', { infer: true });
        if (devAuth) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const gatewayAuth = this.configService.get('gatewayAuth', { infer: true });
        const providedSecret = request.headers[gatewayAuth.sharedSecretHeader];
        if (!gatewayAuth.sharedSecret || providedSecret !== gatewayAuth.sharedSecret) {
            throw new common_1.UnauthorizedException('Missing or invalid gateway secret');
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
        return true;
    }
};
exports.GatewayAuthGuard = GatewayAuthGuard;
exports.GatewayAuthGuard = GatewayAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        core_1.Reflector])
], GatewayAuthGuard);
//# sourceMappingURL=gateway-auth.guard.js.map