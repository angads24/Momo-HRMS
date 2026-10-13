"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceModule = void 0;
const common_1 = require("@nestjs/common");
const geofence_module_1 = require("../geofence/geofence.module");
const employee_module_1 = require("../employee/employee.module");
const policy_module_1 = require("../policy/policy.module");
const face_module_1 = require("../face/face.module");
const attendance_controller_1 = require("./controllers/attendance.controller");
const exceptions_controller_1 = require("./controllers/exceptions.controller");
const attendance_service_1 = require("./services/attendance.service");
const exceptions_service_1 = require("./services/exceptions.service");
const working_time_service_1 = require("./services/working-time.service");
const auto_checkout_scheduler_1 = require("./jobs/auto-checkout.scheduler");
let AttendanceModule = class AttendanceModule {
};
exports.AttendanceModule = AttendanceModule;
exports.AttendanceModule = AttendanceModule = __decorate([
    (0, common_1.Module)({
        imports: [geofence_module_1.GeofenceModule, employee_module_1.EmployeeModule, policy_module_1.PolicyModule, face_module_1.FaceModule],
        controllers: [exceptions_controller_1.ExceptionsController, attendance_controller_1.AttendanceController],
        providers: [attendance_service_1.AttendanceService, exceptions_service_1.ExceptionsService, working_time_service_1.WorkingTimeService, auto_checkout_scheduler_1.AutoCheckoutScheduler],
        exports: [attendance_service_1.AttendanceService, exceptions_service_1.ExceptionsService, working_time_service_1.WorkingTimeService],
    })
], AttendanceModule);
//# sourceMappingURL=attendance.module.js.map