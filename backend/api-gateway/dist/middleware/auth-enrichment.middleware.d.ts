import { NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
export declare class AuthEnrichmentMiddleware implements NestMiddleware {
    private readonly configService;
    private readonly logger;
    private readonly jwtSecret;
    private readonly gatewaySecret;
    constructor(configService: ConfigService);
    use(req: Request, res: Response, next: NextFunction): void;
}
