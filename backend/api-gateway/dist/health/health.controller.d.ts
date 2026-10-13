import { ConfigService } from '@nestjs/config';
export declare class HealthController {
    private readonly configService;
    private readonly services;
    constructor(configService: ConfigService);
    check(): Promise<{
        status: string;
        service: string;
        port: number;
        timestamp: string;
        microservices: Record<string, any>;
    }>;
}
