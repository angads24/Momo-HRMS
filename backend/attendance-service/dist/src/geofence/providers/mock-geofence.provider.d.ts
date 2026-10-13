import { GeofencePoint, GeofenceProvider } from '../interfaces/geofence-provider.interface';
export declare class MockGeofenceProvider implements GeofenceProvider {
    private readonly logger;
    private readonly polygons;
    registerPolygon(officeId: string, polygon: GeofencePoint[]): void;
    isInsideOffice(officeId: string, latitude: number, longitude: number): Promise<boolean>;
}
