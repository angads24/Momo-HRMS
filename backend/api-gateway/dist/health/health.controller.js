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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let HealthController = class HealthController {
    constructor(configService) {
        this.configService = configService;
        this.services = {
            auth: this.configService.get('services.auth', 'http://localhost:3001'),
            attendance: this.configService.get('services.attendance', 'http://localhost:3002'),
            geofence: this.configService.get('services.geofence', 'http://localhost:3003'),
            employee: this.configService.get('services.employee', 'http://localhost:3004'),
            notification: this.configService.get('services.notification', 'http://localhost:3005'),
            face: this.configService.get('services.face', 'http://localhost:3006'),
        };
    }
    async check() {
        const checks = {};
        await Promise.all(Object.entries(this.services).map(async ([name, url]) => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);
                let res = await fetch(`${url}/health`, { signal: controller.signal });
                if (!res.ok && res.status === 404) {
                    res = await fetch(`${url}/api/v1/health`, { signal: controller.signal });
                }
                clearTimeout(timeoutId);
                checks[name] = res.ok ? 'up' : `status ${res.status}`;
            }
            catch {
                checks[name] = 'down';
            }
        }));
        const allUp = Object.values(checks).every((s) => s === 'up');
        return {
            status: allUp ? 'healthy' : 'degraded',
            service: 'api-gateway',
            port: this.configService.get('port', 8000),
            timestamp: new Date().toISOString(),
            microservices: checks,
        };
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "check", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)('health'),
    __metadata("design:paramtypes", [config_1.ConfigService])
], HealthController);
//# sourceMappingURL=health.controller.js.map