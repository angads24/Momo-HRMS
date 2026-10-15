import { Logger } from '@nestjs/common';

const INSECURE_GATEWAY_SECRETS = new Set([
  '',
  'dev-gateway-secret',
  'gateway-secret',
  'changeme',
  'secret',
]);

const INSECURE_JWT_SECRETS = new Set([
  '',
  'dev-access-secret-change-in-production',
  'change-me-access-secret',
  'changeme',
  'secret',
]);

export function validateGatewaySecrets(env: NodeJS.ProcessEnv): void {
  const logger = new Logger('GatewaySecurity');
  const nodeEnv = env.NODE_ENV ?? 'development';
  const jwtSecret = env.JWT_ACCESS_SECRET ?? '';
  const gatewaySecret = env.GATEWAY_SHARED_SECRET ?? '';

  const problems: string[] = [];

  if (INSECURE_JWT_SECRETS.has(jwtSecret)) {
    problems.push('JWT_ACCESS_SECRET is missing or still set to the development default.');
  } else if (jwtSecret.length < 32) {
    problems.push('JWT_ACCESS_SECRET is too short (must be at least 32 characters).');
  }

  if (INSECURE_GATEWAY_SECRETS.has(gatewaySecret)) {
    problems.push('GATEWAY_SHARED_SECRET is missing or still set to the development default.');
  } else if (gatewaySecret.length < 32) {
    problems.push('GATEWAY_SHARED_SECRET is too short (must be at least 32 characters).');
  }

  if (nodeEnv === 'production') {
    if (problems.length > 0) {
      const message = [
        'FATAL: Refusing to start API Gateway in production mode with insecure secrets:',
        ...problems.map((p) => `  - ${p}`),
        '',
        'Generate cryptographically strong secrets with:',
        '  openssl rand -hex 32',
        'and set them in your deployment environment variables.',
      ].join('\n');
      throw new Error(message);
    }
  } else {
    if (problems.length > 0) {
      logger.warn(
        '⚠️ DEVELOPMENT NOTICE: API Gateway is operating with default/insecure secrets. Ensure real secrets are provisioned before production deployment.',
      );
    }
  }
}
