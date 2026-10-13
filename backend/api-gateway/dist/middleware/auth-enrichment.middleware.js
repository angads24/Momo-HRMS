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
var AuthEnrichmentMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthEnrichmentMiddleware = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt = require("jsonwebtoken");
let AuthEnrichmentMiddleware = AuthEnrichmentMiddleware_1 = class AuthEnrichmentMiddleware {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(AuthEnrichmentMiddleware_1.name);
        this.jwtSecret = this.configService.get('jwtAccessSecret', 'dev-access-secret-change-in-production');
        this.gatewaySecret = this.configService.get('gatewaySharedSecret', 'dev-gateway-secret');
    }
    use(req, res, next) {
        delete req.headers['x-user-id'];
        delete req.headers['x-employee-id'];
        delete req.headers['x-roles'];
        delete req.headers['x-permissions'];
        delete req.headers['x-gateway-secret'];
        delete req.headers['x-gateway-signature'];
        delete req.headers['x-gateway-timestamp'];
        req.headers['x-gateway-secret'] = this.gatewaySecret;
        const authHeader = req.headers['authorization'];
        if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            const token = authHeader.slice(7).trim();
            try {
                const decoded = jwt.verify(token, this.jwtSecret);
                if (decoded && typeof decoded === 'object') {
                    if (decoded.sub) {
                        req.headers['x-user-id'] = String(decoded.sub);
                    }
                    if (decoded.employeeId) {
                        req.headers['x-employee-id'] = String(decoded.employeeId);
                    }
                    if (decoded.roles) {
                        req.headers['x-roles'] = Array.isArray(decoded.roles)
                            ? decoded.roles.join(',')
                            : String(decoded.roles);
                    }
                    if (decoded.permissions) {
                        req.headers['x-permissions'] = Array.isArray(decoded.permissions)
                            ? decoded.permissions.join(',')
                            : String(decoded.permissions);
                    }
                }
            }
            catch (err) {
                this.logger.debug(`Could not verify JWT token in gateway: ${err.message}`);
            }
        }
        next();
    }
};
exports.AuthEnrichmentMiddleware = AuthEnrichmentMiddleware;
exports.AuthEnrichmentMiddleware = AuthEnrichmentMiddleware = AuthEnrichmentMiddleware_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AuthEnrichmentMiddleware);
//# sourceMappingURL=auth-enrichment.middleware.js.map