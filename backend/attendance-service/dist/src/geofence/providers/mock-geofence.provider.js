"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MockGeofenceProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockGeofenceProvider = void 0;
const common_1 = require("@nestjs/common");
const point_in_polygon_util_1 = require("./point-in-polygon.util");
const DEFAULT_OFFICE_POLYGON = [
    { latitude: 18.521, longitude: 73.856 },
    { latitude: 18.521, longitude: 73.857 },
    { latitude: 18.52, longitude: 73.857 },
    { latitude: 18.52, longitude: 73.856 },
];
let MockGeofenceProvider = MockGeofenceProvider_1 = class MockGeofenceProvider {
    constructor() {
        this.logger = new common_1.Logger(MockGeofenceProvider_1.name);
        this.polygons = new Map([
            ['OFFICE-001', DEFAULT_OFFICE_POLYGON],
        ]);
    }
    registerPolygon(officeId, polygon) {
        this.polygons.set(officeId, polygon);
    }
    async isInsideOffice(officeId, latitude, longitude) {
        const polygon = this.polygons.get(officeId);
        if (!polygon) {
            this.logger.warn(`No mock polygon registered for officeId=${officeId}; failing closed`);
            return false;
        }
        return (0, point_in_polygon_util_1.isPointInPolygon)({ latitude, longitude }, polygon);
    }
};
exports.MockGeofenceProvider = MockGeofenceProvider;
exports.MockGeofenceProvider = MockGeofenceProvider = MockGeofenceProvider_1 = __decorate([
    (0, common_1.Injectable)()
], MockGeofenceProvider);
//# sourceMappingURL=mock-geofence.provider.js.map