import { PrismaService } from '../../database/prisma.service';
import { VerifyLocationDto } from '../dto/verify-location.dto';
import { CreateOfficeDto } from '../dto/create-office.dto';
import { SetPolygonDto } from '../dto/set-polygon.dto';
import { VerifyLocationResponseDto } from '../dto/office-response.dto';
export declare class GeofenceService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    verifyLocation(dto: VerifyLocationDto): Promise<VerifyLocationResponseDto>;
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
    getOfficeById(idOrCode: string): Promise<{
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
    setOfficePolygon(idOrCode: string, dto: SetPolygonDto): Promise<{
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
    deleteOfficePolygon(idOrCode: string, hard?: boolean): Promise<{
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
    deletePolygonById(polygonId: string): Promise<{
        polygonId: string;
        message: string;
    }>;
    deleteOffice(idOrCode: string, hard?: boolean): Promise<{
        officeId: string;
        officeCode: string;
        message: string;
    }>;
}
