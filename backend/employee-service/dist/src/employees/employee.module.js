"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeModule = void 0;
const common_1 = require("@nestjs/common");
const employee_controller_1 = require("./controllers/employee.controller");
const organization_controller_1 = require("./controllers/organization.controller");
const departments_controller_1 = require("./controllers/departments.controller");
const roles_controller_1 = require("./controllers/roles.controller");
const devices_controller_1 = require("./controllers/devices.controller");
const employee_service_1 = require("./services/employee.service");
const organization_service_1 = require("./services/organization.service");
const email_module_1 = require("../email/email.module");
let EmployeeModule = class EmployeeModule {
};
exports.EmployeeModule = EmployeeModule;
exports.EmployeeModule = EmployeeModule = __decorate([
    (0, common_1.Module)({
        imports: [email_module_1.EmailModule],
        controllers: [
            employee_controller_1.EmployeeController,
            organization_controller_1.OrganizationController,
            departments_controller_1.DepartmentsController,
            roles_controller_1.RolesController,
            devices_controller_1.DevicesController,
        ],
        providers: [employee_service_1.EmployeeService, organization_service_1.OrganizationService],
        exports: [employee_service_1.EmployeeService, organization_service_1.OrganizationService],
    })
], EmployeeModule);
//# sourceMappingURL=employee.module.js.map