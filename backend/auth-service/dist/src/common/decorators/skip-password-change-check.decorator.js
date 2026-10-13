"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkipPasswordChangeCheck = exports.SKIP_PASSWORD_CHECK_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.SKIP_PASSWORD_CHECK_KEY = 'skipPasswordChangeCheck';
const SkipPasswordChangeCheck = () => (0, common_1.SetMetadata)(exports.SKIP_PASSWORD_CHECK_KEY, true);
exports.SkipPasswordChangeCheck = SkipPasswordChangeCheck;
//# sourceMappingURL=skip-password-change-check.decorator.js.map