"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Roles = void 0;
const common_1 = require("@nestjs/common");
const rbac_constants_1 = require("../../common/constants/rbac.constants");
const Roles = (...roles) => (0, common_1.SetMetadata)(rbac_constants_1.ROLES_KEY, roles);
exports.Roles = Roles;
//# sourceMappingURL=roles.decorator.js.map