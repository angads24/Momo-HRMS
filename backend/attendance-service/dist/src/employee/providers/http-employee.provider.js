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
var HttpEmployeeProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpEmployeeProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mock_employee_provider_1 = require("./mock-employee.provider");
let HttpEmployeeProvider = HttpEmployeeProvider_1 = class HttpEmployeeProvider {
    constructor(configService, mockProvider) {
        this.configService = configService;
        this.mockProvider = mockProvider;
        this.logger = new common_1.Logger(HttpEmployeeProvider_1.name);
        this.idCache = new Map();
        this.employeeServiceUrl = this.configService.get('EMPLOYEE_SERVICE_URL', 'http://localhost:3004/api/v1');
    }
    async resolveEmployeeIdentifiers(employeeId) {
        if (!employeeId)
            return [];
        const cached = this.idCache.get(employeeId);
        if (cached && cached.expires > Date.now()) {
            return cached.ids;
        }
        const isMock = this.configService.get('EMPLOYEE_USE_MOCK', 'false') === 'true';
        if (isMock) {
            return [employeeId];
        }
        try {
            const response = await fetch(`${this.employeeServiceUrl}/employees/${encodeURIComponent(employeeId)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-gateway-secret': this.configService.get('GATEWAY_SHARED_SECRET', 'dev-gateway-secret'),
                },
            });
            if (!response.ok) {
                return [employeeId];
            }
            const body = (await response.json());
            const emp = body?.data ?? body;
            const ids = new Set();
            ids.add(employeeId);
            if (emp?.id)
                ids.add(String(emp.id));
            if (emp?.employeeCode)
                ids.add(String(emp.employeeCode));
            if (emp?.userId)
                ids.add(String(emp.userId));
            const result = Array.from(ids);
            const expires = Date.now() + 5 * 60 * 1000;
            for (const id of result) {
                this.idCache.set(id, { ids: result, expires });
            }
            return result;
        }
        catch {
            return [employeeId];
        }
    }
    async isAssignedToOffice(employeeId, officeId) {
        const isMock = this.configService.get('EMPLOYEE_USE_MOCK', 'false') === 'true';
        if (isMock) {
            return this.mockProvider.isAssignedToOffice(employeeId, officeId);
        }
        try {
            const response = await fetch(`${this.employeeServiceUrl}/employees/${encodeURIComponent(employeeId)}/assignment-check?officeId=${encodeURIComponent(officeId)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-gateway-secret': this.configService.get('GATEWAY_SHARED_SECRET', 'dev-gateway-secret'),
                },
            });
            if (!response.ok) {
                if (response.status === 404) {
                    this.logger.warn(`Employee ${employeeId} not found in Employee Service; failing closed.`);
                    return false;
                }
                this.logger.error(`Employee service returned status ${response.status}; falling back to mock provider.`);
                return this.mockProvider.isAssignedToOffice(employeeId, officeId);
            }
            const body = (await response.json());
            return body.data?.isAssigned ?? false;
        }
        catch (error) {
            this.logger.warn(`Failed to reach Employee Service at ${this.employeeServiceUrl} (${error.message}); falling back to mock provider.`);
            return this.mockProvider.isAssignedToOffice(employeeId, officeId);
        }
    }
};
exports.HttpEmployeeProvider = HttpEmployeeProvider;
exports.HttpEmployeeProvider = HttpEmployeeProvider = HttpEmployeeProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        mock_employee_provider_1.MockEmployeeProvider])
], HttpEmployeeProvider);
//# sourceMappingURL=http-employee.provider.js.map