import { NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthEnrichmentMiddleware } from './middleware/auth-enrichment.middleware';
import { RateLimiterMiddleware } from './middleware/rate-limiter.middleware';
export declare class AppModule implements NestModule {
    private readonly configService;
    private readonly authEnrichment;
    private readonly rateLimiter;
    constructor(configService: ConfigService, authEnrichment: AuthEnrichmentMiddleware, rateLimiter: RateLimiterMiddleware);
    configure(consumer: MiddlewareConsumer): void;
}
