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
var HttpFaceAiProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpFaceAiProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mock_face_ai_provider_1 = require("./mock-face-ai.provider");
let HttpFaceAiProvider = HttpFaceAiProvider_1 = class HttpFaceAiProvider {
    constructor(configService, mockProvider) {
        this.configService = configService;
        this.mockProvider = mockProvider;
        this.logger = new common_1.Logger(HttpFaceAiProvider_1.name);
        this.faceServiceUrl = this.configService.get('FACE_SERVICE_URL', 'http://localhost:3006/api/v1');
    }
    async validateVerificationToken(employeeId, token) {
        const isMock = this.configService.get('FACE_USE_MOCK', 'false') === 'true';
        if (isMock) {
            return this.mockProvider.validateVerificationToken(employeeId, token);
        }
        if (!token || token.trim().length === 0) {
            return { valid: false, confidence: 0.0, message: 'Face verification token is required' };
        }
        try {
            const response = await fetch(`${this.faceServiceUrl}/face/verify-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-gateway-secret': this.configService.get('GATEWAY_SHARED_SECRET', 'dev-gateway-secret'),
                },
                body: JSON.stringify({
                    employee_id: employeeId,
                    verification_token: token,
                }),
            });
            if (!response.ok) {
                this.logger.warn(`Face AI service responded with status ${response.status}`);
                return {
                    valid: false,
                    confidence: 0.0,
                    message: `Face verification service rejected token (HTTP ${response.status})`,
                };
            }
            const body = (await response.json());
            return {
                valid: body.valid,
                confidence: body.confidence,
                message: body.message,
            };
        }
        catch (error) {
            this.logger.warn(`Failed to reach Face AI service at ${this.faceServiceUrl}: ${error.message}`);
            if (this.configService.get('FACE_FAIL_CLOSED', 'true') === 'false') {
                this.logger.warn('Falling back to mock face verification because FACE_FAIL_CLOSED=false');
                return this.mockProvider.validateVerificationToken(employeeId, token);
            }
            return {
                valid: false,
                confidence: 0.0,
                message: 'Face verification service is currently unreachable',
            };
        }
    }
};
exports.HttpFaceAiProvider = HttpFaceAiProvider;
exports.HttpFaceAiProvider = HttpFaceAiProvider = HttpFaceAiProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        mock_face_ai_provider_1.MockFaceAiProvider])
], HttpFaceAiProvider);
//# sourceMappingURL=http-face-ai.provider.js.map