"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MockFaceAiProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockFaceAiProvider = void 0;
const common_1 = require("@nestjs/common");
let MockFaceAiProvider = MockFaceAiProvider_1 = class MockFaceAiProvider {
    constructor() {
        this.logger = new common_1.Logger(MockFaceAiProvider_1.name);
    }
    async validateVerificationToken(employeeId, token) {
        this.logger.debug(`[MOCK] Validating face verification token for ${employeeId}`);
        if (!token || token.trim().length === 0) {
            return { valid: false, confidence: 0.0, message: 'Missing face verification token' };
        }
        return { valid: true, confidence: 0.95, message: 'Mock face verification passed' };
    }
};
exports.MockFaceAiProvider = MockFaceAiProvider;
exports.MockFaceAiProvider = MockFaceAiProvider = MockFaceAiProvider_1 = __decorate([
    (0, common_1.Injectable)()
], MockFaceAiProvider);
//# sourceMappingURL=mock-face-ai.provider.js.map