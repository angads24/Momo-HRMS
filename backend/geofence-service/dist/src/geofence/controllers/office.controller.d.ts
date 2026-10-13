import { GeofenceService } from '../services/geofence.service';
import { CreateOfficeDto } from '../dto/create-office.dto';
import { SetPolygonDto } from '../dto/set-polygon.dto';
export declare class OfficeController {
    private readonly geofenceService;
    constructor(geofenceService: GeofenceService);
    listOffices(): Promise<{
        id: string;
        code: string;
        name: string;
        address: string | null;
        city: string | null;
        country: string | null;
        isActive: boolean;
        minAltitudeMeters: number | null;
        maxAltitudeMeters: number | null;
        activePolygon: {
            id: string;
            name: string;
            version: number;
            isActive: boolean;
            vertices: {
                sequence: number;
                latitude: number;
                longitude: number;
            }[];
        } | null;
    }[]>;
    getOfficeById(id: string): Promise<{
        id: string;
        code: string;
        name: string;
        address: string | null;
        city: string | null;
        country: string | null;
        isActive: boolean;
        minAltitudeMeters: number | null;
        maxAltitudeMeters: number | null;
        activePolygon: {
            id: string;
            name: string;
            version: number;
            isActive: boolean;
            vertices: {
                sequence: number;
                latitude: number;
                longitude: number;
            }[];
        } | null;
    }>;
    createOffice(dto: CreateOfficeDto): Promise<{
        id: string;
        code: string;
        name: string;
        address: string | null;
        city: string | null;
        country: string | null;
        isActive: boolean;
        minAltitudeMeters: number | null;
        maxAltitudeMeters: number | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    setPolygon(id: string, dto: SetPolygonDto): Promise<{
        vertices: {
            id: string;
            createdAt: Date;
            sequence: number;
            latitude: number;
            longitude: number;
            polygonId: string;
        }[];
    } & {
        id: string;
        name: string;
        isActive: boolean;
        minAltitudeMeters: number | null;
        maxAltitudeMeters: number | null;
        createdAt: Date;
        updatedAt: Date;
        officeId: string;
        version: number;
    }>;
    deletePolygon(id: string, hard?: string): Promise<{
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
    deleteOffice(id: string, hard?: string): Promise<{
        officeId: string;
        officeCode: string;
        message: string;
    }>;
}
