export declare class VertexResponseDto {
    sequence: number;
    latitude: number;
    longitude: number;
}
export declare class PolygonResponseDto {
    id: string;
    name: string;
    version: number;
    isActive: boolean;
    vertices: VertexResponseDto[];
}
export declare class OfficeResponseDto {
    id: string;
    code: string;
    name: string;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    isActive: boolean;
    activePolygon?: PolygonResponseDto | null;
}
export declare class VerifyLocationResponseDto {
    isInside: boolean;
    officeId: string;
    officeName: string;
    distanceToBoundaryMeters: number;
    altitudeValid: boolean;
}
