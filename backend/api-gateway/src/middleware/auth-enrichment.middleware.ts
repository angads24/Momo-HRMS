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
    const incomingEmpId = req.headers['x-employee-id'] as string | undefined;
    delete req.headers['x-user-id'];
    delete req.headers['x-employee-id'];
    delete req.headers['x-roles'];
    delete req.headers['x-permissions'];
    delete req.headers['x-email'];
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
          } else if (incomingEmpId && typeof incomingEmpId === 'string' && incomingEmpId.trim()) {
            req.headers['x-employee-id'] = incomingEmpId.trim();
          } else if (decoded.username) {
            req.headers['x-employee-id'] = String(decoded.username);
          } else if (decoded.sub) {
            req.headers['x-employee-id'] = String(decoded.sub);
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
          if (decoded.email) {
            req.headers['x-email'] = String(decoded.email);
          }
        }
      } catch (err) {
        this.logger.debug(`Could not verify JWT token in gateway: ${(err as Error).message}`);
        res.status(401).json({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Access token expired or invalid',
        });
        return;
      }
    }

    next();
  }
}
