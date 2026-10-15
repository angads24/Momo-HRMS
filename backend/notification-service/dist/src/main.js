"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const logger = new common_1.Logger('NotificationService');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    const port = configService.get('port', 3005);
    const apiPrefix = configService.get('apiPrefix', 'api/v1');
    const corsOriginEnv = configService.get('corsOrigins', process.env.CORS_ORIGIN || '*');
    const allowedOrigins = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://localhost:8081',
        'http://localhost:8000',
    ];
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin ||
                corsOriginEnv === '*' ||
                allowedOrigins.includes(origin) ||
                corsOriginEnv.split(',').map((o) => o.trim()).includes(origin)) {
                return callback(null, true);
            }
            const isLocalNetwork = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
            if (isLocalNetwork) {
                return callback(null, true);
            }
            return callback(new Error(`CORS blocked for origin: ${origin}`));
        },
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
    });
    app.setGlobalPrefix(apiPrefix, {
        exclude: ['health', 'docs'],
    });
    const swaggerConfig = new swagger_1.DocumentBuilder()
        .setTitle('Notification Service API')
        .setDescription('In-app notification and real-time event streaming service')
        .setVersion('1.0')
        .addTag('Notifications')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
    swagger_1.SwaggerModule.setup('docs', app, document);
    await app.listen(port, '0.0.0.0');
    logger.log(`Notification Service running on http://localhost:${port}/${apiPrefix}`);
    logger.log(`Swagger documentation: http://localhost:${port}/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map