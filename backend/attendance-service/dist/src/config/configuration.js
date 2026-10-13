"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function parseBoolean(value, defaultValue) {
    if (value === undefined)
        return defaultValue;
    return value.toLowerCase() === 'true';
}
exports.default = () => ({
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3002', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    swaggerPath: process.env.SWAGGER_PATH ?? 'api/docs',
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    database: {
        url: process.env.DATABASE_URL ?? '',
    },
    devAuth: {
        enabled: parseBoolean(process.env.ATTENDANCE_DEV_AUTH, true),
        defaultEmployeeId: process.env.DEV_DEFAULT_EMPLOYEE_ID ?? 'EMP-001',
    },
    gatewayAuth: {
        employeeIdHeader: (process.env.GATEWAY_EMPLOYEE_ID_HEADER ?? 'x-employee-id').toLowerCase(),
        userIdHeader: (process.env.GATEWAY_USER_ID_HEADER ?? 'x-user-id').toLowerCase(),
        rolesHeader: (process.env.GATEWAY_ROLES_HEADER ?? 'x-roles').toLowerCase(),
        sharedSecret: process.env.GATEWAY_SHARED_SECRET ?? '',
        sharedSecretHeader: (process.env.GATEWAY_SHARED_SECRET_HEADER ?? 'x-gateway-secret').toLowerCase(),
    },
    policy: {
        checkInStartTime: process.env.POLICY_CHECK_IN_START_TIME ?? '06:00',
        checkInEndTime: process.env.POLICY_CHECK_IN_END_TIME ?? '23:59',
        lateCutoffTime: process.env.POLICY_LATE_CUTOFF_TIME ?? '10:00',
        lateThresholdMinutes: parseInt(process.env.POLICY_LATE_THRESHOLD_MINUTES ?? '0', 10),
        gracePeriodMinutes: parseInt(process.env.POLICY_GRACE_PERIOD_MINUTES ?? '60', 10),
        autoCheckoutEnabled: parseBoolean(process.env.POLICY_AUTO_CHECKOUT_ENABLED, true),
        autoCheckoutTime: process.env.POLICY_AUTO_CHECKOUT_TIME ?? '00:00',
        workingHoursPerDay: parseInt(process.env.POLICY_WORKING_HOURS_PER_DAY ?? '8', 10),
        allowManualCheckoutWhilePaused: parseBoolean(process.env.POLICY_ALLOW_MANUAL_CHECKOUT_WHILE_PAUSED, false),
        minLocationAccuracyMeters: parseInt(process.env.POLICY_MIN_LOCATION_ACCURACY_METERS ?? '50', 10),
    },
    autoCheckout: {
        cron: process.env.AUTO_CHECKOUT_CRON ?? '*/1 * * * *',
        batchSize: parseInt(process.env.AUTO_CHECKOUT_BATCH_SIZE ?? '100', 10),
    },
    throttle: {
        ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
        limit: parseInt(process.env.THROTTLE_LIMIT ?? '60', 10),
    },
    redis: {
        enabled: parseBoolean(process.env.REDIS_ENABLED, false),
        url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    },
});
//# sourceMappingURL=configuration.js.map