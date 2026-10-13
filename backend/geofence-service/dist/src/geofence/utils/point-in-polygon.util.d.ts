export interface Coordinate {
    latitude: number;
    longitude: number;
}
export declare function isPointInPolygon(point: Coordinate, polygon: Coordinate[]): boolean;
export declare function haversineDistanceMeters(coord1: Coordinate, coord2: Coordinate): number;
export declare function distanceToPolygonBoundaryMeters(point: Coordinate, polygon: Coordinate[]): number;
export declare function validatePolygonVertices(vertices: Coordinate[]): {
    valid: boolean;
    error?: string;
};
