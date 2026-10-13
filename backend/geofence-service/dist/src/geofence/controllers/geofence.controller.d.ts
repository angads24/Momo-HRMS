import { GeofenceService } from '../services/geofence.service';
import { VerifyLocationDto } from '../dto/verify-location.dto';
import { VerifyLocationResponseDto } from '../dto/office-response.dto';
export declare class GeofenceController {
    private readonly geofenceService;
    constructor(geofenceService: GeofenceService);
    verify(dto: VerifyLocationDto): Promise<VerifyLocationResponseDto>;
    deletePolygonById(id: string): Promise<{
        polygonId: string;
        message: string;
    }>;
    deleteGeofenceByOfficeId(officeId: string): Promise<{
        officeId: string;
        officeCode: string;
        deletedPolygonsCount: number;
        message: string;
        deactivatedPolygonsCount?: undefined;
    } | {
        officeId: string;
        officeCode: string;
        deactivatedPolygonsCount: number;
        message: string;
        deletedPolygonsCount?: undefined;
    }>;
}
