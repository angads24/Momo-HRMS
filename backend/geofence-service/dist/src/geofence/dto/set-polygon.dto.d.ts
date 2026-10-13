export declare class VertexDto {
    sequence?: number;
    latitude: number;
    longitude: number;
}
export declare class SetPolygonDto {
    name?: string;
    vertices: VertexDto[];
    minAltitudeMeters?: number;
    maxAltitudeMeters?: number;
}
