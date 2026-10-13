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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordChangeGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const skip_password_change_check_decorator_1 = require("../../common/decorators/skip-password-change-check.decorator");
let PasswordChangeGuard = class PasswordChangeGuard {
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const isExempt = this.reflector.getAllAndOverride(skip_password_change_check_decorator_1.SKIP_PASSWORD_CHECK_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isExempt) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            return true;
        }
        if (user.mustChangePassword) {
            throw new common_1.ForbiddenException({
                message: 'Password change required before continuing',
                error: 'PASSWORD_CHANGE_REQUIRED',
            });
        }
        return true;
    }
};
exports.PasswordChangeGuard = PasswordChangeGuard;
exports.PasswordChangeGuard = PasswordChangeGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], PasswordChangeGuard);
//# sourceMappingURL=password-change.guard.js.map