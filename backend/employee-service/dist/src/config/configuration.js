"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => ({
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3004', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    swaggerPath: process.env.SWAGGER_PATH ?? 'api/docs',
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:5173')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    database: {
        url: process.env.DATABASE_URL ?? '',
    },
    gatewayAuth: {
        sharedSecret: process.env.GATEWAY_SHARED_SECRET ?? '',
        sharedSecretHeader: (process.env.GATEWAY_SHARED_SECRET_HEADER ?? 'x-gateway-secret').toLowerCase(),
        rolesHeader: (process.env.GATEWAY_ROLES_HEADER ?? 'x-roles').toLowerCase(),
    },
    devAuth: (process.env.EMPLOYEE_DEV_AUTH ?? 'true').toLowerCase() === 'true',
});
//# sourceMappingURL=configuration.js.map