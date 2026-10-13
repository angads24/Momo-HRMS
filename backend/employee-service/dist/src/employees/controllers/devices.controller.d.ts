export declare class DevicesController {
    updateStatus(id: string, body: {
        status: string;
    }): Promise<{
        id: string;
        status: string;
        updatedAt: string;
    }>;
}
