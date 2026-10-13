"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeofenceModule = void 0;
const common_1 = require("@nestjs/common");
const geofence_provider_interface_1 = require("./interfaces/geofence-provider.interface");
const mock_geofence_provider_1 = require("./providers/mock-geofence.provider");
const http_geofence_provider_1 = require("./providers/http-geofence.provider");
let GeofenceModule = class GeofenceModule {
};
exports.GeofenceModule = GeofenceModule;
exports.GeofenceModule = GeofenceModule = __decorate([
    (0, common_1.Module)({
        providers: [
            mock_geofence_provider_1.MockGeofenceProvider,
            http_geofence_provider_1.HttpGeofenceProvider,
            { provide: geofence_provider_interface_1.GEOFENCE_PROVIDER, useExisting: http_geofence_provider_1.HttpGeofenceProvider },
        ],
        exports: [geofence_provider_interface_1.GEOFENCE_PROVIDER, mock_geofence_provider_1.MockGeofenceProvider, http_geofence_provider_1.HttpGeofenceProvider],
    })
], GeofenceModule);
//# sourceMappingURL=geofence.module.js.map