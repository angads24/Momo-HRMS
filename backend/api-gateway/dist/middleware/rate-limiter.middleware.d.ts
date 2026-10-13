import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
export declare class RateLimiterMiddleware implements NestMiddleware {
    private readonly records;
    use(req: Request, res: Response, next: NextFunction): void;
}
