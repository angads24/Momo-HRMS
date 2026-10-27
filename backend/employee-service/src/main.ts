import * as dns from "dns";
try { dns.setDefaultResultOrder("ipv4first"); } catch {}
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';
import { validateEmployeeEnv } from './config/validate-env';

async function bootstrap() {
  validateEmployeeEnv(process.env);
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<AppConfig, true>);

  // Increase body size limit to handle base64-encoded profile photos (default NestJS is 100kb)
  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ limit: '15mb', extended: true }));

  const apiPrefix = configService.get('apiPrefix', { infer: true });
  const swaggerPath = configService.get('swaggerPath', { infer: true });

  app.setGlobalPrefix(apiPrefix, { exclude: ['health'] });
  app.use(helmet());

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const configured = configService.get('corsOrigins', { infer: true }) || [];
      if (configured.includes('*') || configured.includes(origin)) return callback(null, true);
      const isLocalNetwork = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(
        origin,
      );
      if (isLocalNetwork) return callback(null, true);
      return callback(null, true);
    },
    credentials: true,
    maxAge: 86400,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Employee Service')
    .setDescription(
      'Employee profiles, departments, designations, and office assignment microservice for the Smart Employee Attendance & Management System',
    )
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'x-gateway-secret', in: 'header' }, 'gateway-secret')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(swaggerPath, app, swaggerDocument);

  const port = configService.get('port', { infer: true });
  await app.listen(port, '0.0.0.0');

  Logger.log(`Employee Service listening on port ${port} (prefix: /${apiPrefix})`, 'Bootstrap');
  Logger.log(`Swagger docs available at /${swaggerPath}`, 'Bootstrap');
  Logger.log(`Health check available at /health`, 'Bootstrap');
}

bootstrap();
