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
    dbCheck(): Promise<{
        ok: boolean;
        error: string;
        maskedUrl?: undefined;
        host?: undefined;
        port?: undefined;
        isInternalRailwayDomain?: undefined;
        diagnosis?: undefined;
        tcpTest?: undefined;
    } | {
        ok: boolean;
        error: string;
        maskedUrl: string;
        host?: undefined;
        port?: undefined;
        isInternalRailwayDomain?: undefined;
        diagnosis?: undefined;
        tcpTest?: undefined;
    } | {
        ok: boolean;
        host: string;
        port: number;
        isInternalRailwayDomain: boolean;
        diagnosis: string;
        tcpTest: {
            connected: boolean;
            error?: string;
        };
        maskedUrl: string;
        error?: undefined;
    }>;
}
