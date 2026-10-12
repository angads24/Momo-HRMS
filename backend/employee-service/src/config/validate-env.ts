import { Logger } from '@nestjs/common';

export function validateEmployeeEnv(env: NodeJS.ProcessEnv): void {
  const logger = new Logger('EmployeeServiceSecurity');
  const nodeEnv = env.NODE_ENV ?? 'development';
  const secret = env.GATEWAY_SHARED_SECRET ?? '';
  const devAuth = (env.EMPLOYEE_DEV_AUTH ?? 'false').toLowerCase() === 'true';

  const problems: string[] = [];

  if (nodeEnv === 'production') {
    if (!secret || secret === 'dev-gateway-secret' || secret.length < 32) {
      problems.push('GATEWAY_SHARED_SECRET is insecure or default (must be >= 32 characters in production).');
    }
    if (devAuth) {
      problems.push('EMPLOYEE_DEV_AUTH is set to "true"! Bypassing authentication is strictly prohibited in production.');
    }
    if (!env.DATABASE_URL) {
      problems.push('DATABASE_URL is missing.');
    }

    if (problems.length > 0) {
      const message = [
        'FATAL: Refusing to start Employee Service in production with insecure configuration:',
        ...problems.map((p) => `  - ${p}`),
      ].join('\n');
      throw new Error(message);
    }
  } else {
    if (devAuth) {
      logger.warn('⚠️ DEV NOTICE: EMPLOYEE_DEV_AUTH is enabled. Remember to disable in production.');
    }
  }
}
