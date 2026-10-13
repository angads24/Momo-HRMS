export declare class CreateUserDto {
    username: string;
    email: string;
    fullName?: string;
    password: string;
    roles: string[];
    mustChangePassword?: boolean;
}
