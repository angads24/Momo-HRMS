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
const net = require("net");
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
    async dbCheck() {
        const rawUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || '';
        if (!rawUrl) {
            return {
                ok: false,
                error: 'DATABASE_URL environment variable is NOT set in Render environment!',
            };
        }
        const maskedUrl = rawUrl.replace(/:([^:@]+)@/, ':****@');
        let host = '';
        let port = 3306;
        try {
            const u = new URL(rawUrl.replace(/^mysql:/, 'http:'));
            host = u.hostname;
            port = parseInt(u.port || '3306', 10);
        }
        catch (e) {
            return { ok: false, error: `Invalid URL: ${e.message}`, maskedUrl };
        }
        const isInternal = host.includes('railway.internal');
        const tcpResult = await new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(4000);
            socket.on('connect', () => {
                socket.destroy();
                resolve({ connected: true });
            });
            socket.on('timeout', () => {
                socket.destroy();
                resolve({ connected: false, error: 'Connection timed out (4s)' });
            });
            socket.on('error', (err) => {
                resolve({ connected: false, error: err.message });
            });
            socket.connect(port, host);
        });
        return {
            ok: tcpResult.connected,
            host,
            port,
            isInternalRailwayDomain: isInternal,
            diagnosis: isInternal
                ? 'CRITICAL ERROR: mysql.railway.internal is a private Railway internal domain that CANNOT be resolved from outside Railway (e.g. from Render). You must use the Public TCP Proxy URL from Railway (e.g. *.proxy.rlwy.net:PORT).'
                : tcpResult.connected
                    ? 'TCP connection to database host succeeded!'
                    : `Cannot connect to database host: ${tcpResult.error}`,
            tcpTest: tcpResult,
            maskedUrl,
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
__decorate([
    (0, common_1.Get)('db-check'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "dbCheck", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)('health'),
    __metadata("design:paramtypes", [config_1.ConfigService])
], HealthController);
//# sourceMappingURL=health.controller.js.map