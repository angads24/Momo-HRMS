"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var HttpGeofenceProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpGeofenceProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mock_geofence_provider_1 = require("./mock-geofence.provider");
let HttpGeofenceProvider = HttpGeofenceProvider_1 = class HttpGeofenceProvider {
    constructor(configService, mockProvider) {
        this.configService = configService;
        this.mockProvider = mockProvider;
        this.logger = new common_1.Logger(HttpGeofenceProvider_1.name);
        this.geofenceServiceUrl = this.configService.get('GEOFENCE_SERVICE_URL', 'http://localhost:3003/api/v1');
    }
    async isInsideOffice(officeId, latitude, longitude) {
        const isMock = this.configService.get('GEOFENCE_USE_MOCK', 'false') === 'true';
        if (isMock) {
            return this.mockProvider.isInsideOffice(officeId, latitude, longitude);
        }
        try {
            const response = await fetch(`${this.geofenceServiceUrl}/geofence/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-gateway-secret': this.configService.get('GATEWAY_SHARED_SECRET', 'dev-gateway-secret'),
                },
                body: JSON.stringify({ officeId, latitude, longitude }),
            });
            if (!response.ok) {
                if (response.status === 404) {
                    this.logger.warn(`Office ${officeId} not found in Geofence Service; failing closed.`);
                    return false;
                }
                this.logger.error(`Geofence service returned status ${response.status}; falling back to mock provider.`);
                return this.mockProvider.isInsideOffice(officeId, latitude, longitude);
            }
            const body = (await response.json());
            return body.data?.isInside ?? false;
        }
        catch (error) {
            this.logger.warn(`Failed to reach Geofence Service at ${this.geofenceServiceUrl} (${error.message}); falling back to in-memory mock provider.`);
            return this.mockProvider.isInsideOffice(officeId, latitude, longitude);
        }
    }
};
exports.HttpGeofenceProvider = HttpGeofenceProvider;
exports.HttpGeofenceProvider = HttpGeofenceProvider = HttpGeofenceProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        mock_geofence_provider_1.MockGeofenceProvider])
], HttpGeofenceProvider);
//# sourceMappingURL=http-geofence.provider.js.map