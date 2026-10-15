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
exports.OrganizationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const app_exception_1 = require("../../common/exceptions/app.exception");
const error_codes_1 = require("../../common/constants/error-codes");
let OrganizationService = class OrganizationService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listDepartments() {
        const departments = await this.prisma.department.findMany({
            include: {
                designations: true,
                _count: { select: { employees: true } },
            },
            orderBy: { name: 'asc' },
        });
        return departments.map((d) => ({
            id: d.code || d.id,
            code: d.code,
            name: d.name,
            description: d.description,
            status: 'ACTIVE',
            employeeCount: d._count?.employees ?? 0,
            createdAt: d.createdAt?.toISOString?.() ?? d.createdAt,
            updatedAt: d.updatedAt?.toISOString?.() ?? d.updatedAt,
            designations: (d.designations || []).map((des) => ({
                ...des,
                id: des.code || des.id,
                departmentId: d.code || d.id,
            })),
        }));
    }
    async createDepartment(dto) {
        const existing = await this.prisma.department.findUnique({
            where: { code: dto.code },
        });
        if (existing) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.VALIDATION_FAILED, `Department with code ${dto.code} already exists`, common_1.HttpStatus.CONFLICT);
        }
        return this.prisma.department.create({ data: dto });
    }
    async listDesignations(departmentId) {
        return this.prisma.designation.findMany({
            where: departmentId ? { departmentId } : {},
            include: { department: true },
            orderBy: { title: 'asc' },
        });
    }
    async createDesignation(dto) {
        const existing = await this.prisma.designation.findUnique({
            where: { code: dto.code },
        });
        if (existing) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.VALIDATION_FAILED, `Designation with code ${dto.code} already exists`, common_1.HttpStatus.CONFLICT);
        }
        return this.prisma.designation.create({ data: dto });
    }
    async listRoles() {
        return [
            { id: 'role-super-admin', name: 'SUPER_ADMIN', description: 'Full administrative access across the system', employeeCount: 1 },
            { id: 'role-hr-admin', name: 'HR_ADMIN', description: 'Manages employees, departments, devices and face-template references', employeeCount: 1 },
            { id: 'role-manager', name: 'MANAGER', description: 'Manages a team within a department (no system administration rights)', employeeCount: 0 },
            { id: 'role-employee', name: 'EMPLOYEE', description: 'Standard employee with access to their own record', employeeCount: 1 },
        ];
    }
};
exports.OrganizationService = OrganizationService;
exports.OrganizationService = OrganizationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrganizationService);
//# sourceMappingURL=organization.service.js.map