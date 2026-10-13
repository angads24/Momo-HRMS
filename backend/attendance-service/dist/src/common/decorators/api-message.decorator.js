"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiMessage = exports.API_MESSAGE_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.API_MESSAGE_KEY = 'apiMessage';
const ApiMessage = (message) => (0, common_1.SetMetadata)(exports.API_MESSAGE_KEY, message);
exports.ApiMessage = ApiMessage;
//# sourceMappingURL=api-message.decorator.js.map