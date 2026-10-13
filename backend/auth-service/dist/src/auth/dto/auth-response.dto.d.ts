export declare class SafeUserDto {
    id: string;
    email: string;
    username: string;
    fullName: string | null;
    roles: string[];
    permissions: string[];
    isActive?: boolean;
    mustChangePassword: boolean;
}
export declare class AuthResponseDto {
    accessToken: string;
    refreshToken: string;
    user: SafeUserDto;
}
