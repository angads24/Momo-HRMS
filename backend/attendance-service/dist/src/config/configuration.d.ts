export interface AttendancePolicyConfig {
    checkInStartTime: string;
    checkInEndTime: string;
    lateCutoffTime: string;
    lateThresholdMinutes: number;
    gracePeriodMinutes: number;
    autoCheckoutEnabled: boolean;
    autoCheckoutTime: string;
    workingHoursPerDay: number;
    allowManualCheckoutWhilePaused: boolean;
    minLocationAccuracyMeters: number;
}
export interface AppConfig {
    nodeEnv: string;
    port: number;
    apiPrefix: string;
    swaggerPath: string;
    corsOrigins: string[];
    database: {
        url: string;
    };
    devAuth: {
        enabled: boolean;
        defaultEmployeeId: string;
    };
    gatewayAuth: {
        employeeIdHeader: string;
        userIdHeader: string;
        rolesHeader: string;
        sharedSecret: string;
        sharedSecretHeader: string;
    };
    policy: AttendancePolicyConfig;
    autoCheckout: {
        cron: string;
        batchSize: number;
    };
    throttle: {
        ttl: number;
        limit: number;
    };
    redis: {
        enabled: boolean;
        url: string;
    };
}
declare const _default: () => AppConfig;
export default _default;
