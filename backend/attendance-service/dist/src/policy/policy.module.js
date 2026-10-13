"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyModule = void 0;
const common_1 = require("@nestjs/common");
const attendance_policy_provider_interface_1 = require("./interfaces/attendance-policy-provider.interface");
const config_attendance_policy_provider_1 = require("./providers/config-attendance-policy.provider");
let PolicyModule = class PolicyModule {
};
exports.PolicyModule = PolicyModule;
exports.PolicyModule = PolicyModule = __decorate([
    (0, common_1.Module)({
        providers: [
            config_attendance_policy_provider_1.ConfigAttendancePolicyProvider,
            { provide: attendance_policy_provider_interface_1.ATTENDANCE_POLICY_PROVIDER, useExisting: config_attendance_policy_provider_1.ConfigAttendancePolicyProvider },
        ],
        exports: [attendance_policy_provider_interface_1.ATTENDANCE_POLICY_PROVIDER],
    })
], PolicyModule);
//# sourceMappingURL=policy.module.js.map