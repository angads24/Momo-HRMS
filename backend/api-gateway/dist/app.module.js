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
exports.AppModule = void 0;
const crypto = require("crypto");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const http_proxy_middleware_1 = require("http-proxy-middleware");
const configuration_1 = require("./config/configuration");
const health_controller_1 = require("./health/health.controller");
const auth_enrichment_middleware_1 = require("./middleware/auth-enrichment.middleware");
const rate_limiter_middleware_1 = require("./middleware/rate-limiter.middleware");
let AppModule = class AppModule {
    constructor(configService, authEnrichment, rateLimiter) {
        this.configService = configService;
        this.authEnrichment = authEnrichment;
        this.rateLimiter = rateLimiter;
    }
    configure(consumer) {
        consumer.apply((req, res, next) => this.rateLimiter.use(req, res, next)).forRoutes('*');
        consumer.apply((req, res, next) => this.authEnrichment.use(req, res, next)).forRoutes('*');
        consumer.apply((req, res, next) => {
            if (req.url && req.url.includes('/api/v1/auth/auth/')) {
                req.url = req.url.replace('/api/v1/auth/auth/', '/api/v1/auth/');
            }
            next();
        }).forRoutes('*');
        const authTarget = this.configService.get('services.auth', 'http://localhost:3001');
        const attendanceTarget = this.configService.get('services.attendance', 'http://localhost:3002');
        const geofenceTarget = this.configService.get('services.geofence', 'http://localhost:3003');
        const employeeTarget = this.configService.get('services.employee', 'http://localhost:3004');
        const notificationTarget = this.configService.get('services.notification', 'http://localhost:3005');
        const faceTarget = this.configService.get('services.face', 'http://localhost:3006');
        const gatewaySecret = this.configService.get('gatewaySharedSecret', 'dev-gateway-secret');
        const createProxy = (target) => (0, http_proxy_middleware_1.createProxyMiddleware)({
            target,
            changeOrigin: true,
            on: {
                proxyReq: (proxyReq, req) => {
                    const timestamp = Date.now().toString();
                    const targetUrl = req.originalUrl || req.url || '';
                    const signature = crypto
                        .createHmac('sha256', gatewaySecret)
                        .update(`${targetUrl}:${timestamp}:${gatewaySecret}`)
                        .digest('hex');
                    proxyReq.setHeader('x-gateway-timestamp', timestamp);
                    proxyReq.setHeader('x-gateway-signature', signature);
                    proxyReq.setHeader('x-gateway-secret', gatewaySecret);
                    if (req.headers['x-user-id']) {
                        proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
                    }
                    else {
                        proxyReq.removeHeader('x-user-id');
                    }
                    if (req.headers['x-employee-id']) {
                        proxyReq.setHeader('x-employee-id', req.headers['x-employee-id']);
                    }
                    else {
                        proxyReq.removeHeader('x-employee-id');
                    }
                    if (req.headers['x-roles']) {
                        proxyReq.setHeader('x-roles', req.headers['x-roles']);
                    }
                    else {
                        proxyReq.removeHeader('x-roles');
                    }
                    if (req.headers['x-permissions']) {
                        proxyReq.setHeader('x-permissions', req.headers['x-permissions']);
                    }
                    else {
                        proxyReq.removeHeader('x-permissions');
                    }
                    (0, http_proxy_middleware_1.fixRequestBody)(proxyReq, req);
                },
                error: (err, req, res) => {
                    if (!res.headersSent) {
                        res.status(503).json({
                            success: false,
                            statusCode: 503,
                            message: `Gateway failed to connect to downstream service at ${target}`,
                            error: err.message,
                        });
                    }
                },
            },
        });
        consumer.apply(createProxy(authTarget)).forRoutes({ path: 'api/v1/auth*', method: common_1.RequestMethod.ALL });
        consumer.apply(createProxy(attendanceTarget)).forRoutes({ path: 'api/v1/attendance*', method: common_1.RequestMethod.ALL });
        consumer.apply(createProxy(geofenceTarget)).forRoutes({ path: 'api/v1/geofence*', method: common_1.RequestMethod.ALL }, { path: 'api/v1/offices*', method: common_1.RequestMethod.ALL });
        consumer.apply(createProxy(employeeTarget)).forRoutes({ path: 'api/v1/employees*', method: common_1.RequestMethod.ALL }, { path: 'api/v1/organization*', method: common_1.RequestMethod.ALL }, { path: 'api/v1/departments*', method: common_1.RequestMethod.ALL }, { path: 'api/v1/roles*', method: common_1.RequestMethod.ALL }, { path: 'api/v1/devices*', method: common_1.RequestMethod.ALL });
        consumer.apply(createProxy(notificationTarget)).forRoutes({ path: 'api/v1/notifications*', method: common_1.RequestMethod.ALL });
        consumer.apply(createProxy(faceTarget)).forRoutes({ path: 'api/v1/face*', method: common_1.RequestMethod.ALL });
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [configuration_1.default],
            }),
            throttler_1.ThrottlerModule.forRoot([{
                    ttl: 60000,
                    limit: 100,
                }]),
        ],
        controllers: [health_controller_1.HealthController],
        providers: [auth_enrichment_middleware_1.AuthEnrichmentMiddleware, rate_limiter_middleware_1.RateLimiterMiddleware],
    }),
    __metadata("design:paramtypes", [config_1.ConfigService,
        auth_enrichment_middleware_1.AuthEnrichmentMiddleware,
        rate_limiter_middleware_1.RateLimiterMiddleware])
], AppModule);
//# sourceMappingURL=app.module.js.map