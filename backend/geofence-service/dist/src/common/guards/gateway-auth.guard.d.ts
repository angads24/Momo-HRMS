import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AppConfig } from '../../config/configuration';
export declare class GatewayAuthGuard implements CanActivate {
    private readonly configService;
    private readonly reflector;
    constructor(configService: ConfigService<AppConfig, true>, reflector: Reflector);
    canActivate(context: ExecutionContext): boolean;
}
