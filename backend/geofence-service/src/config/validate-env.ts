export function validateGeofenceEnv(env: NodeJS.ProcessEnv): void {
  const nodeEnv = env.NODE_ENV ?? 'development';
  const secret = env.GATEWAY_SHARED_SECRET ?? '';

  const problems: string[] = [];

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
