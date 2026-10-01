import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('ApiGateway');
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // Support large biometric payloads (e.g. multi-frame face liveness images)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 8000);
  const corsOrigin = configService.get<string>('corsOrigin', '*');

  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin.split(','),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(port);
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
}

bootstrap();
