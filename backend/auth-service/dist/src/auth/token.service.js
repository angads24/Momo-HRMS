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
exports.TokenService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const crypto_1 = require("crypto");
let TokenService = class TokenService {
    constructor(jwtService, configService) {
        this.jwtService = jwtService;
        this.configService = configService;
    }
    signAccessToken(payload) {
        return this.jwtService.sign(payload, {
            secret: this.configService.get('jwt.accessSecret', { infer: true }),
            expiresIn: this.configService.get('jwt.accessExpiration', { infer: true }),
        });
    }
    signRefreshToken(userId) {
        const sessionId = (0, crypto_1.randomUUID)();
        const payload = { sub: userId, sessionId };
        const token = this.jwtService.sign(payload, {
            secret: this.configService.get('jwt.refreshSecret', { infer: true }),
            expiresIn: this.configService.get('jwt.refreshExpiration', { infer: true }),
        });
        return { token, sessionId };
    }
    verifyRefreshToken(token) {
        return this.jwtService.verify(token, {
            secret: this.configService.get('jwt.refreshSecret', { infer: true }),
        });
    }
    hashToken(rawToken) {
        return (0, crypto_1.createHash)('sha256').update(rawToken).digest('hex');
    }
    getRefreshExpiryDate() {
        const expiration = this.configService.get('jwt.refreshExpiration', { infer: true });
        return new Date(Date.now() + this.parseDurationMs(expiration));
    }
    parseDurationMs(duration) {
        const match = /^(\d+)([smhd])$/.exec(duration.trim());
        if (!match) {
            return 7 * 24 * 60 * 60 * 1000;
        }
        const value = parseInt(match[1], 10);
        const unit = match[2];
        const unitMs = {
            s: 1000,
            m: 60 * 1000,
            h: 60 * 60 * 1000,
            d: 24 * 60 * 60 * 1000,
        };
        return value * unitMs[unit];
    }
};
exports.TokenService = TokenService;
exports.TokenService = TokenService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService])
], TokenService);
//# sourceMappingURL=token.service.js.map