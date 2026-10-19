import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCodes } from '../../common/constants/error-codes';
import { CreateDepartmentDto } from '../dto/department.dto';
import { CreateDesignationDto } from '../dto/designation.dto';

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async listDepartments() {
    const departments = await this.prisma.department.findMany({
      include: {
        designations: true,
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    });

    return departments.map((d: any) => ({
      id: d.code || d.id,
      code: d.code,
      name: d.name,
      description: d.description,
      status: 'ACTIVE',
      employeeCount: d._count?.employees ?? 0,
      createdAt: d.createdAt?.toISOString?.() ?? d.createdAt,
      updatedAt: d.updatedAt?.toISOString?.() ?? d.updatedAt,
      designations: (d.designations || []).map((des: any) => ({
        ...des,
        id: des.code || des.id,
        departmentId: d.code || d.id,
      })),
    }));
  }

  async createDepartment(dto: CreateDepartmentDto) {
    const existing = await this.prisma.department.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new AppException(
        ErrorCodes.VALIDATION_FAILED,
        `Department with code ${dto.code} already exists`,
        HttpStatus.CONFLICT,
      );
    }

    const created = await this.prisma.department.create({ data: dto });
    return {
      id: created.code || created.id,
      code: created.code,
      name: created.name,
      description: created.description,
    };
  }

  async listDesignations(departmentId?: string) {
    let whereClause: any = {};
    if (departmentId) {
      const dept = await this.prisma.department.findFirst({
        where: { OR: [{ id: departmentId }, { code: departmentId }] },
      });
      whereClause = dept ? { departmentId: dept.id } : { departmentId };
    }

    const designations = await this.prisma.designation.findMany({
      where: whereClause,
      include: { department: true },
      orderBy: { title: 'asc' },
    });

    return designations.map((des: any) => ({
      id: des.code || des.id,
      code: des.code,
      title: des.title,
      description: des.description,
      departmentId: des.department?.code || des.departmentId,
      department: des.department
        ? {
            id: des.department.code || des.department.id,
            code: des.department.code,
            name: des.department.name,
            description: des.department.description,
          }
        : null,
    }));
  }

  async createDesignation(dto: CreateDesignationDto) {
    const existing = await this.prisma.designation.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new AppException(
        ErrorCodes.VALIDATION_FAILED,
        `Designation with code ${dto.code} already exists`,
        HttpStatus.CONFLICT,
      );
    }

    let resolvedDeptId = dto.departmentId;
    const dept = await this.prisma.department.findFirst({
      where: { OR: [{ id: dto.departmentId }, { code: dto.departmentId }] },
    });
    if (dept) {
      resolvedDeptId = dept.id;
    }

    const created = await this.prisma.designation.create({
      data: {
        ...dto,
        departmentId: resolvedDeptId,
      },
      include: { department: true },
    });

    return {
      id: created.code || created.id,
      code: created.code,
      title: created.title,
      departmentId: created.department?.code || created.departmentId,
      department: created.department
        ? {
            id: created.department.code || created.department.id,
            code: created.department.code,
            name: created.department.name,
            description: created.department.description,
          }
        : null,
    };
  }

  async listRoles() {
    return [
      { id: 'role-super-admin', name: 'SUPER_ADMIN', description: 'Full administrative access across the system', employeeCount: 1 },
      { id: 'role-hr-admin', name: 'HR_ADMIN', description: 'Manages employees, departments, devices and face-template references', employeeCount: 1 },
      { id: 'role-manager', name: 'MANAGER', description: 'Manages a team within a department (no system administration rights)', employeeCount: 0 },
      { id: 'role-employee', name: 'EMPLOYEE', description: 'Standard employee with access to their own record', employeeCount: 1 },
    ];
  }
}

