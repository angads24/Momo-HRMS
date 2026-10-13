"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSecrets = validateSecrets;
const PLACEHOLDER_VALUES = new Set([
    '',
    'change-me-access-secret',
    'change-me-refresh-secret',
    'changeme',
    'secret',
]);
function validateSecrets(env) {
    const accessSecret = env.JWT_ACCESS_SECRET ?? '';
    const refreshSecret = env.JWT_REFRESH_SECRET ?? '';
    const nodeEnv = env.NODE_ENV ?? 'development';
    const problems = [];
    if (PLACEHOLDER_VALUES.has(accessSecret)) {
        problems.push('JWT_ACCESS_SECRET is missing or still set to the example placeholder value.');
    }
    if (PLACEHOLDER_VALUES.has(refreshSecret)) {
        problems.push('JWT_REFRESH_SECRET is missing or still set to the example placeholder value.');
    }
    if (accessSecret && accessSecret.length < 32) {
        problems.push('JWT_ACCESS_SECRET is too short (use at least 32 random characters).');
    }
    if (refreshSecret && refreshSecret.length < 32) {
        problems.push('JWT_REFRESH_SECRET is too short (use at least 32 random characters).');
    }
    if (accessSecret && refreshSecret && accessSecret === refreshSecret) {
        problems.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values.');
    }
    if (problems.length === 0) {
        return;
    }
    const message = [
        'Refusing to start: insecure JWT configuration detected.',
        ...problems.map((p) => `  - ${p}`),
        '',
        'Generate strong secrets with, e.g.:',
        '  openssl rand -hex 32',
        'and set them in your environment (never commit real secrets to .env files in git).',
    ].join('\n');
    if (nodeEnv === 'test') {
        return;
    }
    throw new Error(message);
}
//# sourceMappingURL=validate-env.js.map