"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPointInPolygon = isPointInPolygon;
function isPointInPolygon(point, polygon) {
    if (polygon.length < 3) {
        return false;
    }
    let inside = false;
    const { latitude: y, longitude: x } = point;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].longitude;
        const yi = polygon[i].latitude;
        const xj = polygon[j].longitude;
        const yj = polygon[j].latitude;
        const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersects) {
            inside = !inside;
        }
    }
    return inside;
}
//# sourceMappingURL=point-in-polygon.util.js.map