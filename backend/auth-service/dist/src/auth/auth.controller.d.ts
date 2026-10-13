import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SetInitialPasswordDto } from './dto/set-initial-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
export declare class AuthController {
    private readonly authService;
    private readonly usersService;
    constructor(authService: AuthService, usersService: UsersService);
    login(dto: LoginDto, req: Request): Promise<AuthResponseDto>;
    refresh(dto: RefreshTokenDto, req: Request): Promise<AuthResponseDto>;
    logout(dto: RefreshTokenDto): Promise<{
        success: true;
    }>;
    logoutAll(user: AuthenticatedUser): Promise<{
        success: true;
    }>;
    me(user: AuthenticatedUser): Promise<{
        id: string;
        username: string;
        fullName: string | null;
        email: string;
        roles: string[];
        permissions: string[];
        isActive: boolean;
        mustChangePassword: boolean;
    }>;
    changePassword(user: AuthenticatedUser, dto: ChangePasswordDto): Promise<{
        success: true;
    }>;
    setInitialPassword(user: AuthenticatedUser, dto: SetInitialPasswordDto): Promise<{
        success: true;
    }>;
    private extractMetadata;
}
