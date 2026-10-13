"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockEmployeeProvider = void 0;
const common_1 = require("@nestjs/common");
let MockEmployeeProvider = class MockEmployeeProvider {
    constructor() {
        this.deniedPairs = new Set();
    }
    denyAssignment(employeeId, officeId) {
        this.deniedPairs.add(`${employeeId}:${officeId}`);
    }
    async isAssignedToOffice(employeeId, officeId) {
        return !this.deniedPairs.has(`${employeeId}:${officeId}`);
    }
    async resolveEmployeeIdentifiers(employeeId) {
        return [employeeId];
    }
};
exports.MockEmployeeProvider = MockEmployeeProvider;
exports.MockEmployeeProvider = MockEmployeeProvider = __decorate([
    (0, common_1.Injectable)()
], MockEmployeeProvider);
//# sourceMappingURL=mock-employee.provider.js.map