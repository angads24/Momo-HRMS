export interface AppConfig {
    nodeEnv: string;
    port: number;
    apiPrefix: string;
    corsOrigins: string[];
    database: {
        url: string;
    };
    jwt: {
        accessSecret: string;
        refreshSecret: string;
        accessExpiration: string;
        refreshExpiration: string;
    };
    throttle: {
        loginTtl: number;
        loginLimit: number;
    };
    redis: {
        enabled: boolean;
        url: string;
    };
}
declare const _default: () => AppConfig;
export default _default;
