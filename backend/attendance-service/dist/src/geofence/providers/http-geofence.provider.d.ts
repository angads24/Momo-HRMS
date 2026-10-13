import { ConfigService } from '@nestjs/config';
import { GeofenceProvider } from '../interfaces/geofence-provider.interface';
import { MockGeofenceProvider } from './mock-geofence.provider';
export declare class HttpGeofenceProvider implements GeofenceProvider {
    private readonly configService;
    private readonly mockProvider;
    private readonly logger;
    private readonly geofenceServiceUrl;
    constructor(configService: ConfigService, mockProvider: MockGeofenceProvider);
    isInsideOffice(officeId: string, latitude: number, longitude: number): Promise<boolean>;
}
