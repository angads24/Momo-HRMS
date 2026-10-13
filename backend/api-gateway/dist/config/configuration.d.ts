declare const _default: () => {
    port: number;
    nodeEnv: string;
    corsOrigin: string;
    jwtAccessSecret: string;
    gatewaySharedSecret: string;
    services: {
        auth: string;
        attendance: string;
        geofence: string;
        employee: string;
        notification: string;
        face: string;
    };
};
export default _default;
