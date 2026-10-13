export interface AppConfig {
    nodeEnv: string;
    port: number;
    apiPrefix: string;
    swaggerPath: string;
    corsOrigins: string[];
    database: {
        url: string;
    };
    gatewayAuth: {
        sharedSecret: string;
        sharedSecretHeader: string;
        rolesHeader: string;
    };
    devAuth: boolean;
}
declare const _default: () => AppConfig;
export default _default;
