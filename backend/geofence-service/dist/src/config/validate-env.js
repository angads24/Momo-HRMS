"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateGeofenceEnv = validateGeofenceEnv;
function validateGeofenceEnv(env) {
    const nodeEnv = env.NODE_ENV ?? 'development';
    const secret = env.GATEWAY_SHARED_SECRET ?? '';
    const problems = [];
    if (nodeEnv === 'production') {
        if (!secret || secret === 'dev-gateway-secret' || secret.length < 32) {
            problems.push('GATEWAY_SHARED_SECRET is insecure or default (must be >= 32 characters in production).');
        }
        if (!env.DATABASE_URL) {
            problems.push('DATABASE_URL is missing.');
        }
        if (problems.length > 0) {
            const message = [
                'FATAL: Refusing to start Geofence Service in production with insecure configuration:',
                ...problems.map((p) => `  - ${p}`),
            ].join('\n');
            throw new Error(message);
        }
    }
}
//# sourceMappingURL=validate-env.js.map