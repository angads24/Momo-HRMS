import * as crypto from 'crypto';
import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AppConfig } from '../../config/configuration';
import { EmployeeAuthContext } from '../interfaces/employee-auth-context.interface';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class EmployeeAuthGuard implements CanActivate {
  private readonly logger = new Logger(EmployeeAuthGuard.name);
  private hasWarnedDevAuth = false;

  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const devAuth = this.configService.get('devAuth', { infer: true });
    const gatewayAuth = this.configService.get('gatewayAuth', { infer: true });

    if (devAuth.enabled) {
      if (!this.hasWarnedDevAuth) {
        this.logger.warn(
          'ATTENDANCE_DEV_AUTH=true — identity headers are trusted WITHOUT verification. ' +
            'This must never be enabled outside local development.',
        );
        this.hasWarnedDevAuth = true;
      }

      const isFromGateway = request.headers[gatewayAuth.sharedSecretHeader] === gatewayAuth.sharedSecret;
      const headerEmpId = request.headers[gatewayAuth.employeeIdHeader] as string | undefined;
      const headerUserId = request.headers[gatewayAuth.userIdHeader] as string | undefined;

      if (isFromGateway && !headerEmpId && !headerUserId) {
        throw new UnauthorizedException('Missing authenticated employee identity');
      }

      const employeeId = headerEmpId || headerUserId || devAuth.defaultEmployeeId;
      const userId = headerUserId || employeeId;
      const rolesHeader = request.headers[gatewayAuth.rolesHeader] as string | undefined;

      const parseRolesHeader = (header?: string, fallback: string[] = []): string[] => {
        if (!header) return fallback;
        const parsed = header
          .replace(/[\[\]"'\\]/g, '')
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean);
        return parsed.length > 0 ? parsed : fallback;
      };

      const authContext: EmployeeAuthContext = {
        employeeId,
        userId,
        roles: parseRolesHeader(rolesHeader, ['EMPLOYEE']),
        isDevAuth: true,
      };
      (request as Request & { employeeAuth: EmployeeAuthContext }).employeeAuth = authContext;
      return true;
    }
    // Production mode.
    const providedSecret = request.headers[gatewayAuth.sharedSecretHeader] as string | undefined;
    if (!gatewayAuth.sharedSecret || providedSecret !== gatewayAuth.sharedSecret) {
      throw new UnauthorizedException('Missing or invalid gateway credentials');
    }

    // Verify HMAC Gateway Request Signature to prevent internal port spoofing
    const signature = request.headers['x-gateway-signature'] as string | undefined;
    const timestamp = request.headers['x-gateway-timestamp'] as string | undefined;
    if (signature && timestamp) {
      const tsNum = parseInt(timestamp, 10);
      const now = Date.now();
      if (Math.abs(now - tsNum) > 300000) {
        throw new UnauthorizedException('Gateway request signature expired (potential replay attack)');
      }
      const targetUrl = request.originalUrl || request.url || '';
      const expectedSig = crypto
        .createHmac('sha256', gatewayAuth.sharedSecret)
        .update(`${targetUrl}:${timestamp}:${gatewayAuth.sharedSecret}`)
        .digest('hex');

      if (signature !== expectedSig) {
        throw new UnauthorizedException('Invalid HMAC gateway signature');
      }
    }

    const rawEmployeeId = request.headers[gatewayAuth.employeeIdHeader] as string | undefined;
    const rawUserId = request.headers[gatewayAuth.userIdHeader] as string | undefined;
    const employeeId = rawEmployeeId || rawUserId;
    const userId = rawUserId || rawEmployeeId;
    const rolesHeader = request.headers[gatewayAuth.rolesHeader] as string | undefined;

    if (!employeeId || !userId) {
      throw new UnauthorizedException('Missing authenticated identity headers');
    }

    const parseRolesHeader = (header?: string, fallback: string[] = []): string[] => {
      if (!header) return fallback;
      const parsed = header
        .replace(/[\[\]"'\\]/g, '')
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);
      return parsed.length > 0 ? parsed : fallback;
    };

    const authContext: EmployeeAuthContext = {
      employeeId,
      userId,
      roles: parseRolesHeader(rolesHeader, []),
      isDevAuth: false,
    };
    (request as Request & { employeeAuth: EmployeeAuthContext }).employeeAuth = authContext;
    return true;
  }
}
