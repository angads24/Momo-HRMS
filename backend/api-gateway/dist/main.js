"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const express_1 = require("express");
const app_module_1 = require("./app.module");
const validate_env_1 = require("./config/validate-env");
async function bootstrap() {
    (0, validate_env_1.validateGatewaySecrets)(process.env);
    const logger = new common_1.Logger('ApiGateway');
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        bodyParser: false,
    });
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.set('trust proxy', 1);
    app.use((req, res, next) => {
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-XSS-Protection', '0');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(self), microphone=()');
        res.removeHeader('X-Powered-By');
        next();
    });
    app.use((0, express_1.json)({ limit: '50mb' }));
    app.use((0, express_1.urlencoded)({ extended: true, limit: '50mb' }));
    const configService = app.get(config_1.ConfigService);
    const port = configService.get('port', 8000);
    const corsOriginEnv = configService.get('corsOrigin', '*');
    const defaultAllowedOrigins = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://localhost:8081',
    ];
    const configuredOrigins = corsOriginEnv === '*'
        ? ['*']
        : corsOriginEnv.split(',').map((o) => o.trim()).filter(Boolean);
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin) {
                return callback(null, true);
            }
            if (configuredOrigins.includes('*') ||
                configuredOrigins.includes(origin) ||
                defaultAllowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            const isLocalNetwork = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
            if (isLocalNetwork) {
                return callback(null, true);
            }
            return callback(new Error(`CORS blocked for origin: ${origin}`));
        },
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        allowedHeaders: 'Content-Type,Authorization,X-Requested-With,Accept,Origin,x-employee-id,x-client-event-id,x-gateway-secret',
        credentials: true,
    });
    await app.listen(port, '0.0.0.0');
    logger.log(`API Gateway is running on http://localhost:${port}`);
    logger.log(`Gateway Health Check: http://localhost:${port}/health`);
    logger.log(`Routes proxying:`);
    logger.log(`  /api/v1/auth/*          -> ${configService.get('services.auth')}`);
    logger.log(`  /api/v1/attendance/*    -> ${configService.get('services.attendance')}`);
    logger.log(`  /api/v1/geofence/*      -> ${configService.get('services.geofence')}`);
    logger.log(`  /api/v1/offices/*       -> ${configService.get('services.geofence')}`);
    logger.log(`  /api/v1/employees/*     -> ${configService.get('services.employee')}`);
    logger.log(`  /api/v1/organization/*  -> ${configService.get('services.employee')}`);
    logger.log(`  /api/v1/notifications/* -> ${configService.get('services.notification')}`);
    logger.log(`  /api/v1/face/*          -> ${configService.get('services.face')}`);
}
bootstrap();
//# sourceMappingURL=main.js.map