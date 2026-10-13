"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiMessage = exports.API_MESSAGE_METADATA = void 0;
const common_1 = require("@nestjs/common");
exports.API_MESSAGE_METADATA = 'api_message';
const ApiMessage = (message) => (0, common_1.SetMetadata)(exports.API_MESSAGE_METADATA, message);
exports.ApiMessage = ApiMessage;
//# sourceMappingURL=api-message.decorator.js.map