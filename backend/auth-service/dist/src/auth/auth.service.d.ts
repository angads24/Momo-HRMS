import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { TokenService } from './token.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
export interface RequestMetadata {
    ipAddress?: string;
    userAgent?: string;
}
export declare class AuthService {
    private readonly prisma;
    private readonly usersService;
    private readonly tokenService;
    constructor(prisma: PrismaService, usersService: UsersService, tokenService: TokenService);
    login(dto: LoginDto, metadata: RequestMetadata): Promise<AuthResponseDto>;
    refresh(rawRefreshToken: string, metadata: RequestMetadata): Promise<AuthResponseDto>;
    logout(rawRefreshToken: string): Promise<void>;
    logoutAll(userId: string): Promise<void>;
    changePassword(userId: string, dto: ChangePasswordDto): Promise<void>;
    setInitialPassword(userId: string, newPassword: string): Promise<void>;
    private issueTokenPair;
}
