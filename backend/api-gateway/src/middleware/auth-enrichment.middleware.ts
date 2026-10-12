import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthEnrichmentMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthEnrichmentMiddleware.name);
  private readonly jwtSecret: string;
  private readonly gatewaySecret: string;

  constructor(private readonly configService: ConfigService) {
    this.jwtSecret = this.configService.get<string>('jwtAccessSecret', 'dev-access-secret-change-in-production');
    this.gatewaySecret = this.configService.get<string>('gatewaySharedSecret', 'dev-gateway-secret');
  }

  use(req: Request, res: Response, next: NextFunction) {
    // 1. CRITICAL SECURITY: Sanitize all untrusted client-supplied identity & gateway headers.
    // External clients must NEVER be able to inject or spoof these internal headers.
    delete req.headers['x-user-id'];
    delete req.headers['x-employee-id'];
    delete req.headers['x-roles'];
    delete req.headers['x-permissions'];
    delete req.headers['x-gateway-secret'];
    delete req.headers['x-gateway-signature'];
    delete req.headers['x-gateway-timestamp'];

    // 2. Inject internal gateway shared secret for downstream service verification
    req.headers['x-gateway-secret'] = this.gatewaySecret;

    // 3. Decode & verify the JWT access token from Authorization header
    const authHeader = req.headers['authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      try {
        const decoded = jwt.verify(token, this.jwtSecret) as any;
        if (decoded && typeof decoded === 'object') {
          // Strictly populate authenticated identity from validated JWT claims
          if (decoded.sub) {
            req.headers['x-user-id'] = String(decoded.sub);
          }
          if (decoded.employeeId) {
            req.headers['x-employee-id'] = String(decoded.employeeId);
          }
          if (decoded.roles) {
            req.headers['x-roles'] = Array.isArray(decoded.roles)
              ? decoded.roles.join(',')
              : String(decoded.roles);
          }
          if (decoded.permissions) {
            req.headers['x-permissions'] = Array.isArray(decoded.permissions)
              ? decoded.permissions.join(',')
              : String(decoded.permissions);
          }
        }
      } catch (err) {
        // Token is expired, malformed, or has an invalid signature.
        // Identity headers remain strictly stripped; downstream services will reject unauthenticated access.
        this.logger.debug(`Could not verify JWT token in gateway: ${(err as Error).message}`);
      }
    }

    next();
  }
}
