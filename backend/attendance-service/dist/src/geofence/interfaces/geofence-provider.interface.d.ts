export interface GeofencePoint {
    latitude: number;
    longitude: number;
}
export interface GeofenceProvider {
    isInsideOffice(officeId: string, latitude: number, longitude: number): Promise<boolean>;
}
export declare const GEOFENCE_PROVIDER: unique symbol;
