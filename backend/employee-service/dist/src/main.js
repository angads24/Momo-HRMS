"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const helmet_1 = require("helmet");
const app_module_1 = require("./app.module");
const validate_env_1 = require("./config/validate-env");
async function bootstrap() {
    (0, validate_env_1.validateEmployeeEnv)(process.env);
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get((config_1.ConfigService));
    const apiPrefix = configService.get('apiPrefix', { infer: true });
    const swaggerPath = configService.get('swaggerPath', { infer: true });
    app.setGlobalPrefix(apiPrefix, { exclude: ['health'] });
    app.use((0, helmet_1.default)());
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            const configured = configService.get('corsOrigins', { infer: true }) || [];
            if (configured.includes('*') || configured.includes(origin))
                return callback(null, true);
            const isLocalNetwork = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
            if (isLocalNetwork)
                return callback(null, true);
            return callback(null, true);
        },
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    const swaggerConfig = new swagger_1.DocumentBuilder()
        .setTitle('Employee Service')
        .setDescription('Employee profiles, departments, designations, and office assignment microservice for the Smart Employee Attendance & Management System')
        .setVersion('1.0')
        .addApiKey({ type: 'apiKey', name: 'x-gateway-secret', in: 'header' }, 'gateway-secret')
        .build();
    const swaggerDocument = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
    swagger_1.SwaggerModule.setup(swaggerPath, app, swaggerDocument);
    const port = configService.get('port', { infer: true });
    await app.listen(port, '0.0.0.0');
    common_1.Logger.log(`Employee Service listening on port ${port} (prefix: /${apiPrefix})`, 'Bootstrap');
    common_1.Logger.log(`Swagger docs available at /${swaggerPath}`, 'Bootstrap');
    common_1.Logger.log(`Health check available at /health`, 'Bootstrap');
}
bootstrap();
//# sourceMappingURL=main.js.map