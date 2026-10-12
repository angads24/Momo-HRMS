import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded, Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { validateGatewaySecrets } from './config/validate-env';

async function bootstrap() {
  validateGatewaySecrets(process.env);
  const logger = new Logger('ApiGateway');
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // Enable trust proxy for secure client IP detection behind reverse proxies
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  // Security Headers Middleware (OWASP recommended)
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(self), microphone=()');
    res.removeHeader('X-Powered-By');
    next();
  });

  // Support biometric payloads (e.g. multi-frame face liveness images)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 8000);
  const corsOriginEnv = configService.get<string>('corsOrigin', '*');

  const defaultAllowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://localhost:8081',
  ];

  const configuredOrigins = corsOriginEnv === '*'
    ? ['*']
    : corsOriginEnv.split(',').map((o) => o.trim()).filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as mobile apps, native apps, curl)
      if (!origin) {
        return callback(null, true);
      }
      if (
        configuredOrigins.includes('*') ||
        configuredOrigins.includes(origin) ||
        defaultAllowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }
      // Allow any Wi-Fi / LAN IP address on the local network (192.168.x.x, 10.x.x.x, 172.16-31.x.x, localhost)
      const isLocalNetwork = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(
        origin,
      );
      if (isLocalNetwork) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization,X-Requested-With,Accept,Origin,x-employee-id,x-client-event-id,x-gateway-secret',
    credentials: true,
  });

  await app.listen(port, '0.0.0.0');
  logger.log(`API Gateway is running on http://localhost:${port}`);
  logger.log(`Gateway Health Check: http://localhost:${port}/health`);
  logger.log(`Routes proxying:`);
  logger.log(`  /api/v1/auth/*          -> ${configService.get('services.auth')}`);
  logger.log(`  /api/v1/attendance/*    -> ${configService.get('services.attendance')}`);
  logger.log(`  /api/v1/geofence/*      -> ${configService.get('services.geofence')}`);
  logger.log(`  /api/v1/offices/*       -> ${configService.get('services.geofence')}`);
  logger.log(`  /api/v1/employees/*     -> ${configService.get('services.employee')}`);
  logger.log(`  /api/v1/organization/*  -> ${configService.get('services.employee')}`);
  logger.log(`  /api/v1/notifications/* -> ${configService.get('services.notification')}`);
  logger.log(`  /api/v1/face/*          -> ${configService.get('services.face')}`);
}

bootstrap();
