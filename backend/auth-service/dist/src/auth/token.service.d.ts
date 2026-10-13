import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AppConfig } from '../config/configuration';
import { JwtPayload } from './interfaces/jwt-payload.interface';
export interface RefreshTokenPayload {
    sub: string;
    sessionId: string;
}
export declare class TokenService {
    private readonly jwtService;
    private readonly configService;
    constructor(jwtService: JwtService, configService: ConfigService<AppConfig, true>);
    signAccessToken(payload: JwtPayload): string;
    signRefreshToken(userId: string): {
        token: string;
        sessionId: string;
    };
    verifyRefreshToken(token: string): RefreshTokenPayload;
    hashToken(rawToken: string): string;
    getRefreshExpiryDate(): Date;
    private parseDurationMs;
}
