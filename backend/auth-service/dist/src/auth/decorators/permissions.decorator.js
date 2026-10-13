"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Permissions = void 0;
const common_1 = require("@nestjs/common");
const rbac_constants_1 = require("../../common/constants/rbac.constants");
const Permissions = (...permissions) => (0, common_1.SetMetadata)(rbac_constants_1.PERMISSIONS_KEY, permissions);
exports.Permissions = Permissions;
//# sourceMappingURL=permissions.decorator.js.map