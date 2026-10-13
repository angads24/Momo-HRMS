"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaceModule = void 0;
const common_1 = require("@nestjs/common");
const face_ai_provider_interface_1 = require("./interfaces/face-ai-provider.interface");
const http_face_ai_provider_1 = require("./providers/http-face-ai.provider");
const mock_face_ai_provider_1 = require("./providers/mock-face-ai.provider");
let FaceModule = class FaceModule {
};
exports.FaceModule = FaceModule;
exports.FaceModule = FaceModule = __decorate([
    (0, common_1.Module)({
        providers: [
            mock_face_ai_provider_1.MockFaceAiProvider,
            http_face_ai_provider_1.HttpFaceAiProvider,
            {
                provide: face_ai_provider_interface_1.FACE_AI_PROVIDER,
                useExisting: http_face_ai_provider_1.HttpFaceAiProvider,
            },
        ],
        exports: [face_ai_provider_interface_1.FACE_AI_PROVIDER, mock_face_ai_provider_1.MockFaceAiProvider, http_face_ai_provider_1.HttpFaceAiProvider],
    })
], FaceModule);
//# sourceMappingURL=face.module.js.map