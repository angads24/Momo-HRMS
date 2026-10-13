export declare const ROLES_KEY = "roles";
export declare const PERMISSIONS_KEY = "permissions";
export declare const IS_PUBLIC_KEY = "isPublic";
export declare const ROLE_NAMES: {
    readonly EMPLOYEE: "EMPLOYEE";
    readonly HR_ADMIN: "HR_ADMIN";
    readonly SUPER_ADMIN: "SUPER_ADMIN";
};
export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];
