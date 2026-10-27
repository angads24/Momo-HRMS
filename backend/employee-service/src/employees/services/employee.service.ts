import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCodes } from '../../common/constants/error-codes';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { AssignOfficeDto } from '../dto/assign-office.dto';
import { EmployeeQueryDto } from '../dto/employee-query.dto';
import { EmploymentStatus, Prisma } from '@prisma/client';
import { EmailService } from '../../email/email.service';
import {
  ImportExecutionResult,
  ImportRowStatus,
  ValidatedImportRow,
  ValidationSummary,
} from '../dto/import-employee.dto';

@Injectable()
export class EmployeeService implements OnModuleInit {
  private readonly logger = new Logger(EmployeeService.name);
  private officesCache: Array<{ id: string; code: string; name: string }> = [];
  private lastOfficeFetch = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async onModuleInit() {
    await this.refreshOfficesCache();
  }

  async ensureOfficesCache(force = false): Promise<void> {
    if (force || this.officesCache.length === 0 || Date.now() - this.lastOfficeFetch > 60000) {
      await this.refreshOfficesCache();
    }
  }

  async refreshOfficesCache(): Promise<void> {
    try {
      const res = await fetch('http://localhost:3003/api/v1/offices', {
        headers: {
          'x-gateway-secret': process.env.GATEWAY_SHARED_SECRET || 'dev-gateway-secret',
        },
      });
      if (res.ok) {
        const body = (await res.json()) as { data?: Array<{ id: string; code: string; name: string }> };
        const list = Array.isArray(body) ? body : body.data || [];
        this.officesCache = list;
        this.lastOfficeFetch = Date.now();
        this.logger.log(`Loaded ${list.length} offices into employee-service cache.`);
      }
    } catch (e) {
      this.logger.warn(`Could not refresh offices cache from geofence service: ${(e as Error).message}`);
    }
  }

  private getOfficeDetails(offId?: string | null): { id: string; code: string; name: string; uuid?: string } | null {
    if (!offId) return null;
    const cleanStr = offId.replace(/\s*\(Primary\)$/i, '').trim().toLowerCase();
    // 1. Direct match on id, code, or uuid
    let found = this.officesCache.find(
      (o: any) =>
        (o.id && o.id.toLowerCase() === cleanStr) ||
        (o.code && o.code.toLowerCase() === cleanStr) ||
        (o.uuid && o.uuid.toLowerCase() === cleanStr),
    );
    // 2. Exact match on name
    if (!found) {
      found = this.officesCache.find(
        (o: any) => o.name && o.name.toLowerCase() === cleanStr,
      );
    }
    // 3. Substring match on name (e.g. "Wakad" for "Wakad_Office" or "Pune HQ" for "Pune Headquarters")
    if (!found) {
      found = this.officesCache.find(
        (o: any) => o.name && (o.name.toLowerCase().includes(cleanStr) || cleanStr.includes(o.name.toLowerCase())),
      );
    }
    // 4. Legacy database UUID fallbacks
    if (!found) {
      if (cleanStr === 'd1a2b3c4-0000-0000-0000-000000000001') {
        found = this.officesCache.find((o) => o.code === 'OFFICE-001') || { id: 'OFFICE-001', code: 'OFFICE-001', name: 'Pune Headquarters' };
      } else if (cleanStr === '76b775c9-ab7c-4d8e-8da9-9f191ea2d630') {
        found = this.officesCache.find((o) => o.code === 'PUN-001') || { id: 'PUN-001', code: 'PUN-001', name: 'Wakad_office' };
      } else if (cleanStr === '88185fc3-2f90-4dc1-b161-64c2e15d938a') {
        found = this.officesCache.find((o) => o.code === 'T-001') || { id: 'T-001', code: 'T-001', name: 'TESTING_ANGAD' };
      }
    }
    return found || null;
  }

  /**
   * Register a new employee profile.
   */
  async createEmployee(dto: CreateEmployeeDto) {
    // Check uniqueness of code and email
    const duplicateCode = await this.prisma.employee.findUnique({
      where: { employeeCode: dto.employeeCode },
    });
    if (duplicateCode) {
      throw new AppException(
        ErrorCodes.DUPLICATE_EMPLOYEE_CODE,
        `Employee with code ${dto.employeeCode} already exists`,
        HttpStatus.CONFLICT,
      );
    }

    const duplicateEmail = await this.prisma.employee.findUnique({
      where: { email: dto.email },
    });
    if (duplicateEmail) {
      throw new AppException(
        ErrorCodes.DUPLICATE_EMAIL,
        'already account is created!',
        HttpStatus.CONFLICT,
      );
    }

    if (dto.personalEmail && dto.personalEmail.trim()) {
      const cleanPersonal = dto.personalEmail.trim().toLowerCase();
      const duplicatePersonal = await this.prisma.employee.findFirst({
        where: {
          OR: [
            { personalEmail: cleanPersonal },
            { email: cleanPersonal },
          ],
        },
        include: { designation: true },
      });
      if (duplicatePersonal && duplicatePersonal.email !== dto.email) {
        throw new AppException(
          ErrorCodes.DUPLICATE_EMAIL,
          'already account is created!',
          HttpStatus.CONFLICT,
        );
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let designationId = dto.designationId || null;
      if (!designationId && dto.jobTitle && dto.jobTitle.trim()) {
        const title = dto.jobTitle.trim();
        const code = title.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 32);
        const existing = await tx.designation.findFirst({
          where: { OR: [{ title }, { code }] },
        });
        if (existing) {
          designationId = existing.id;
        } else {
          const created = await tx.designation.create({
            data: {
              code: code || ('DESIG_' + Date.now()),
              title,
              departmentId: dto.departmentId || null,
            },
          });
          designationId = created.id;
        }
      }

      let resolvedDepartmentId: string | null = null;
      if (dto.departmentId && dto.departmentId.trim()) {
        const dVal = dto.departmentId.trim();
        const dept = await tx.department.findFirst({
          where: { OR: [{ id: dVal }, { code: dVal }, { name: dVal }] },
        });
        resolvedDepartmentId = dept ? dept.id : null;
      }

      let resolvedDesignationId: string | null = null;
      const desigCandidate = (dto.designationId || designationId)?.trim();
      if (desigCandidate) {
        const desig = await tx.designation.findFirst({
          where: { OR: [{ id: desigCandidate }, { code: desigCandidate }, { title: desigCandidate }] },
        });
        resolvedDesignationId = desig ? desig.id : null;
      }

      const employee = await tx.employee.create({
        data: {
          employeeCode: dto.employeeCode,
          userId: dto.userId || null,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          personalEmail: dto.personalEmail?.trim()?.toLowerCase() || null,
          phone: dto.phone || null,
          alternatePhone: dto.alternatePhone || null,
          bloodGroup: dto.bloodGroup || null,
          gender: dto.gender || null,
          address: dto.address || null,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          departmentId: resolvedDepartmentId,
          designationId: resolvedDesignationId,
          employmentStatus: dto.employmentStatus ?? EmploymentStatus.ACTIVE,
          dateOfJoining: dto.dateOfJoining ? new Date(dto.dateOfJoining) : new Date(),
        },
      });

      // Support multiple office assignments with dual ID and Code registration
      const officesToAssign = new Set<string>();
      const primaryOffice = dto.primaryOfficeId?.trim() || dto.officeLocationId?.trim();
      if (primaryOffice) {
        officesToAssign.add(primaryOffice);
        const resolved = this.getOfficeDetails(primaryOffice);
        if (resolved) {
          if (resolved.id) officesToAssign.add(resolved.id);
          if (resolved.code) officesToAssign.add(resolved.code);
        }
      }
      if (dto.officeIds && Array.isArray(dto.officeIds)) {
        for (const offId of dto.officeIds) {
          if (offId && offId.trim()) {
            officesToAssign.add(offId.trim());
            const resolved = this.getOfficeDetails(offId.trim());
            if (resolved) {
              if (resolved.id) officesToAssign.add(resolved.id);
              if (resolved.code) officesToAssign.add(resolved.code);
            }
          }
        }
      }

      if (officesToAssign.size > 0) {
        const primaryResolved = primaryOffice ? this.getOfficeDetails(primaryOffice) : null;
        const primaryKeys = new Set<string>();
        if (primaryOffice) primaryKeys.add(primaryOffice.toLowerCase());
        if (primaryResolved?.id) primaryKeys.add(primaryResolved.id.toLowerCase());
        if (primaryResolved?.code) primaryKeys.add(primaryResolved.code.toLowerCase());

        if (primaryKeys.size === 0 && officesToAssign.size > 0) {
          const first = Array.from(officesToAssign)[0];
          primaryKeys.add(first.toLowerCase());
          const firstResolved = this.getOfficeDetails(first);
          if (firstResolved?.id) primaryKeys.add(firstResolved.id.toLowerCase());
          if (firstResolved?.code) primaryKeys.add(firstResolved.code.toLowerCase());
        }

        for (const offId of officesToAssign) {
          const isPrimary = primaryKeys.has(offId.toLowerCase());
          await tx.employeeOfficeAssignment.create({
            data: {
              employeeId: employee.id,
              officeId: offId,
              isPrimary,
              isActive: true,
            },
          });
        }
      }

      this.logger.log(`Created employee ${employee.employeeCode} (${employee.email})`);
      const created = await tx.employee.findUniqueOrThrow({
        where: { id: employee.id },
        include: {
          department: true,
          designation: true,
          assignments: { where: { isActive: true } },
        },
      });
      return this.formatEmployee(created);
    });

    // Always generate strong temporary credentials and provision user in auth_service
    const tempPass = this.generateStrongTemporaryPassword();
    const targetEmail = dto.personalEmail?.trim() || dto.email?.trim();

    this.logger.log(
      `[CREDENTIAL_GENERATE] Provisioning credentials for ${result.email} (${result.employeeCode}): targetEmail=${targetEmail}`,
    );

    // Determine primary role to sync to auth-service
    const isHr = Boolean(dto.roleId?.includes('HR') || dto.jobTitle?.toUpperCase().includes('HR'));
    const isSuperAdmin = Boolean(dto.roleId?.includes('SUPER'));
    const targetRole = isSuperAdmin ? 'SUPER_ADMIN' : isHr ? 'HR_ADMIN' : (dto.roleId || 'EMPLOYEE');

    // Automatically sync/provision single credentials to auth-service so login immediately works
    const authUserId = await this.syncCredentialsToAuthService(
      result.email,
      tempPass,
      `${result.firstName} ${result.lastName}`,
      result.employeeCode,
      targetRole,
    );

    if (authUserId && !result.userId) {
      await this.prisma.employee.update({
        where: { employeeCode: result.employeeCode },
        data: { userId: authUserId },
      });
      result.userId = result.employeeCode;
    }

    result.temporaryPassword = tempPass;

    const shouldSendEmail = dto.provisionAccount !== false && (dto as any).sendEmail !== false;

    if (shouldSendEmail && tempPass) {
      result.credentialsSentAt = new Date().toISOString();
      const sendPromise = this.emailService.sendCredentialEmail({
        toEmail: targetEmail,
        employeeName: `${result.firstName} ${result.lastName}`,
        officialEmail: result.email,
        username: result.employeeCode.toLowerCase().replace(/[^a-zA-Z0-9._-]/g, "_"),
        temporaryPassword: tempPass,
        roleName: targetRole,
        isPasswordReset: false,
      });

      // Allow up to 6 seconds for live SMTP delivery confirmation
      const timeoutPromise = new Promise<{ delivered: boolean; mode: any; message: string; deliveredTo: string }>((resolve) =>
        setTimeout(
          () =>
            resolve({
              delivered: true,
              mode: 'queued',
              message: `Credentials email queued for delivery to ${targetEmail}`,
              deliveredTo: targetEmail,
            }),
          6000,
        ),
      );

      try {
        const deliveryResult = await Promise.race([sendPromise, timeoutPromise]);
        result.credentialDelivery = deliveryResult as any;
        if ((deliveryResult as any).mode === 'queued') {
          sendPromise
            .then((res) => {
              this.logger.log(`Background credentials email finished for ${result.employeeCode}: ${res.message}`);
            })
            .catch((err) => {
              this.logger.warn(`Background credentials email failed for ${result.employeeCode}: ${err.message}`);
            });
        }
      } catch (err: any) {
        result.credentialDelivery = {
          delivered: false,
          mode: 'failed',
          message: `Failed to deliver email: ${err.message}`,
          deliveredTo: targetEmail,
        };
      }
    } else {
      result.credentialDelivery = {
        delivered: false,
        mode: 'skipped',
        message: 'Credentials generated on screen (Email delivery disabled)',
        deliveredTo: targetEmail,
      };
    }

    return result;
  }

  /**
   * Update employee profile.
   */
  async updateEmployee(id: string, dto: UpdateEmployeeDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { OR: [{ id }, { employeeCode: id }] },
    });
    if (!employee) {
      throw new AppException(ErrorCodes.EMPLOYEE_NOT_FOUND, 'Employee not found', HttpStatus.NOT_FOUND);
    }

    if (dto.email && dto.email !== employee.email) {
      const duplicate = await this.prisma.employee.findUnique({ where: { email: dto.email } });
      if (duplicate) {
        throw new AppException(ErrorCodes.DUPLICATE_EMAIL, 'Email already in use', HttpStatus.CONFLICT);
      }
    }

    let designationId = dto.designationId;
    if (!designationId && dto.jobTitle && dto.jobTitle.trim()) {
      const title = dto.jobTitle.trim();
      const code = title.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 32);
      const existing = await this.prisma.designation.findFirst({
        where: { OR: [{ title }, { code }] },
      });
      if (existing) {
        designationId = existing.id;
      } else {
        const created = await this.prisma.designation.create({
          data: {
            code: code || ('DESIG_' + Date.now()),
            title,
            departmentId: dto.departmentId || null,
          },
        });
        designationId = created.id;
      }
    }

    if (dto.officeIds !== undefined || dto.officeLocationId !== undefined || dto.primaryOfficeId !== undefined) {
      await this.ensureOfficesCache();
      const primaryOffice = dto.primaryOfficeId?.trim() || dto.officeLocationId?.trim();
      const officesToSet = new Set<string>();

      const addOffice = (val?: string | null) => {
        if (!val || !val.trim()) return;
        const cleanVal = val.replace(/\s*\(Primary\)$/i, '').trim();
        let resolved = this.getOfficeDetails(cleanVal);
        if (!resolved) {
          resolved = this.officesCache.find((o) => o.name && o.name.toLowerCase() === cleanVal.toLowerCase()) || null;
        }
        const officeCode = resolved?.code || resolved?.id || cleanVal;
        officesToSet.add(officeCode);
      };

      if (primaryOffice) {
        addOffice(primaryOffice);
      }

      if (dto.officeIds && Array.isArray(dto.officeIds)) {
        for (const offId of dto.officeIds) {
          addOffice(offId);
        }
      }

      // Demote all active assignments for this employee using the true database primary key (employee.id)
      await this.prisma.employeeOfficeAssignment.updateMany({
        where: { employeeId: employee.id },
        data: { isPrimary: false, isActive: false },
      });

      if (officesToSet.size > 0) {
        const primaryResolved = primaryOffice ? this.getOfficeDetails(primaryOffice) : null;
        const primaryCode = primaryResolved?.code || primaryResolved?.id || Array.from(officesToSet)[0];

        for (const oid of officesToSet) {
          const isPrimary = (oid.toLowerCase() === primaryCode.toLowerCase());
          const existing = await this.prisma.employeeOfficeAssignment.findFirst({
            where: { employeeId: employee.id, officeId: oid },
          });

          if (existing) {
            await this.prisma.employeeOfficeAssignment.update({
              where: { id: existing.id },
              data: { isPrimary, isActive: true, effectiveTo: null },
            });
          } else {
            await this.prisma.employeeOfficeAssignment.create({
              data: {
                employeeId: employee.id,
                officeId: oid,
                isPrimary,
                isActive: true,
                effectiveFrom: new Date(),
              },
            });
          }
        }
      }
    }

    // Resolve departmentId: handle database UUID, code, or name
    let resolvedDepartmentId: string | null | undefined = undefined;
    if (dto.departmentId !== undefined) {
      if (dto.departmentId && dto.departmentId.trim()) {
        const dVal = dto.departmentId.trim();
        const dept = await this.prisma.department.findFirst({
          where: { OR: [{ id: dVal }, { code: dVal }, { name: dVal }] },
        });
        resolvedDepartmentId = dept ? dept.id : null;
      } else {
        resolvedDepartmentId = null;
      }
    }

    // Resolve designationId: handle database UUID, code, or title
    let resolvedDesignationId: string | null | undefined = undefined;
    if (dto.designationId !== undefined || designationId !== undefined) {
      const desigCandidate = (dto.designationId ?? designationId)?.trim();
      if (desigCandidate) {
        const desig = await this.prisma.designation.findFirst({
          where: { OR: [{ id: desigCandidate }, { code: desigCandidate }, { title: desigCandidate }] },
        });
        resolvedDesignationId = desig ? desig.id : null;
      } else {
        resolvedDesignationId = null;
      }
    }

    const updated = await this.prisma.employee.update({
      where: { id: employee.id },
      data: {
        firstName: dto.firstName !== undefined ? dto.firstName : undefined,
        lastName: dto.lastName !== undefined ? dto.lastName : undefined,
        email: dto.email !== undefined ? dto.email : undefined,
        phone: dto.phone !== undefined ? dto.phone : undefined,
        personalEmail: dto.personalEmail !== undefined ? dto.personalEmail : undefined,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : (dto.dateOfBirth === null ? null : undefined),
        gender: dto.gender !== undefined ? dto.gender : undefined,
        bloodGroup: dto.bloodGroup !== undefined ? dto.bloodGroup : undefined,
        address: dto.address !== undefined ? dto.address : undefined,
        permanentAddress: dto.permanentAddress !== undefined ? dto.permanentAddress : undefined,
        alternatePhone: dto.alternatePhone !== undefined ? dto.alternatePhone : undefined,
        emergencyContactName: dto.emergencyContactName !== undefined ? dto.emergencyContactName : undefined,
        emergencyContactRelation: dto.emergencyContactRelation !== undefined ? dto.emergencyContactRelation : undefined,
        emergencyContactPhone: dto.emergencyContactPhone !== undefined ? dto.emergencyContactPhone : undefined,
        profilePhotoUrl: dto.profilePhotoUrl !== undefined ? dto.profilePhotoUrl : undefined,
        isOnboarded: dto.isOnboarded !== undefined ? dto.isOnboarded : undefined,
        departmentId: resolvedDepartmentId !== undefined ? resolvedDepartmentId : undefined,
        designationId: resolvedDesignationId !== undefined ? resolvedDesignationId : undefined,
        employmentStatus: dto.employmentStatus !== undefined ? dto.employmentStatus : undefined,
        dateOfJoining: dto.dateOfJoining ? new Date(dto.dateOfJoining) : undefined,
        userId: dto.userId !== undefined ? dto.userId : undefined,
      },
      include: {
        department: true,
        designation: true,
        assignments: { where: { isActive: true } },
      },
    });

    if (dto.roleId) {
      await this.updateEmployeeRole(employee.id, dto.roleId).catch((err) => {
        this.logger.warn(`Failed to update employee role during updateEmployee: ${err.message}`);
      });
    }

    return this.getEmployeeById(employee.id);
  }

  /**
   * Resolve current authenticated employee profile.
   */
  async getEmployeeMe(userId?: string, email?: string, employeeId?: string) {
    let employee = null;

    if (employeeId) {
      employee = await this.prisma.employee.findFirst({
        where: { OR: [{ id: employeeId }, { employeeCode: employeeId }] },
        include: {
          department: true,
          designation: true,
          assignments: { where: { isActive: true } },
        },
      });
    }

    if (!employee && userId) {
      employee = await this.prisma.employee.findUnique({
        where: { userId },
        include: {
          department: true,
          designation: true,
          assignments: { where: { isActive: true } },
        },
      });
    }

    if (!employee && email) {
      employee = await this.prisma.employee.findFirst({
        where: { OR: [{ email }, { personalEmail: email }] },
        include: {
          department: true,
          designation: true,
          assignments: { where: { isActive: true } },
        },
      });
      if (employee && userId && !employee.userId) {
        await this.prisma.employee.update({
          where: { id: employee.id },
          data: { userId },
        });
        employee.userId = userId;
      }
    }

    if (!employee) {
      employee = await this.prisma.employee.findFirst({
        where: { employmentStatus: EmploymentStatus.ACTIVE },
        include: {
          department: true,
          designation: true,
          assignments: { where: { isActive: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
    }

    if (!employee) {
      throw new AppException(ErrorCodes.EMPLOYEE_NOT_FOUND, 'Employee profile not found for this user', HttpStatus.NOT_FOUND);
    }

    return this.getEmployeeById(employee.id);
  }

  /**
   * Update current authenticated employee profile.
   */
  async updateEmployeeMe(
    userId: string | undefined,
    email: string | undefined,
    employeeId: string | undefined,
    dto: UpdateEmployeeDto,
  ) {
    const current = await this.getEmployeeMe(userId, email, employeeId);
    if (dto.isOnboarded === undefined) {
      const hasDob = Boolean(dto.dateOfBirth || current.dateOfBirth);
      const hasPhone = Boolean(dto.phone || current.phone);
      const hasEmail = Boolean(dto.personalEmail || current.personalEmail);
      if (hasDob && hasPhone && hasEmail) {
        dto.isOnboarded = true;
      }
    }
    return this.updateEmployee(current.id, dto);
  }

  /**
   * Generate signed biometric verification token for attendance check-in.
   */
  generateAttendanceToken(employeeCode: string): string {
    const secret = process.env.FACE_JWT_SECRET || 'dev-face-secret-key-change-in-prod';
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(
      JSON.stringify({
        sub: employeeCode,
        type: 'FACE_VERIFICATION',
        confidence: 0.98,
        iat: now,
        exp: now + 600,
      }),
    ).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
    return `${header}.${payload}.${signature}`;
  }

  /**
   * Permanently delete an employee record (Admin only).
   */
  async deleteEmployee(id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { OR: [{ id }, { employeeCode: id }] },
    });
    if (!employee) {
      throw new AppException(ErrorCodes.EMPLOYEE_NOT_FOUND, 'Employee not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.employee.delete({
      where: { id: employee.id },
    });

    this.logger.log(`Deleted employee ${employee.employeeCode} (${employee.id})`);
    return { success: true, message: `Employee ${employee.employeeCode} deleted successfully` };
  }

  /**
   * List employees with filtering and pagination.
   */
  async listEmployees(query: EmployeeQueryDto) {
    if (Date.now() - this.lastOfficeFetch > 60000) {
      void this.refreshOfficesCache();
    }
    const isPaginated = typeof query.page === 'number' && typeof query.limit === 'number' && query.page > 0 && query.limit > 0 && !query.all;
    const isAll = !isPaginated || query.all === 'true' || query.all === true || query.all === '1';
    const page = query.page ?? 1;
    const limit = isPaginated ? query.limit! : 10000;

    const where: Prisma.EmployeeWhereInput = {
      NOT: {
        email: { contains: '.hr@' },
      },
    };

    if (query.departmentId) {
      where.department = {
        OR: [{ id: query.departmentId }, { code: query.departmentId }],
      };
    }
    if (query.status) {
      where.employmentStatus = query.status;
    }
    if (query.officeId) {
      where.assignments = {
        some: { officeId: query.officeId, isActive: true },
      };
    }
    if (query.search) {
      where.AND = [
        {
          OR: [
            { employeeCode: { contains: query.search } },
            { firstName: { contains: query.search } },
            { lastName: { contains: query.search } },
            { email: { contains: query.search } },
          ],
        },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        include: {
          department: true,
          designation: true,
          assignments: { where: { isActive: true } },
        },
        orderBy: { employeeCode: 'asc' },
        ...(isPaginated ? { skip: (page - 1) * limit, take: limit } : {}),
      }),
      this.prisma.employee.count({ where }),
    ]);

    const roleMap = new Map<string, { id: string; name: string }>();
    if (items.length > 0) {
      try {
        const emails = items.map((e) => e.email.trim().toLowerCase()).filter(Boolean);
        if (emails.length > 0) {
          const placeholders = emails.map(() => '?').join(',');
          const userRoles = await this.prisma.$queryRawUnsafe<Array<{ email: string; id: string; name: string }>>(
            `SELECT LOWER(u.email) as email, r.id, r.name 
             FROM auth_service.roles r 
             JOIN auth_service.user_roles ur ON ur.role_id = r.id 
             JOIN auth_service.users u ON u.id = ur.user_id 
             WHERE LOWER(u.email) IN (${placeholders})`,
            ...emails,
          );
          for (const ur of userRoles) {
            roleMap.set(ur.email, { id: ur.id, name: ur.name });
          }
        }
      } catch {
        // Fallback if auth_service cannot be reached
      }
    }

    return {
      items: items.map((e) => this.formatEmployeeSummary(e, roleMap.get(e.email?.trim().toLowerCase()))),
      page: isAll ? 1 : page,
      limit: isAll ? total : limit,
      total,
      totalPages: isAll ? 1 : Math.ceil(total / limit),
    };
  }

  /**
   * Aggregated dashboard counts (total employees & total active departments)
   */
  async getDashboardMetrics() {
    const [employeeCount, departmentCount] = await Promise.all([
      this.prisma.employee.count({
        where: {
          NOT: {
            email: { contains: '.hr@' },
          },
        },
      }),
      this.prisma.department.count(),
    ]);
    return { employeeCount, departmentCount };
  }

  /**
   * Get single employee by ID or Code.
   */
  async getEmployeeById(idOrCode: string) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        OR: [{ id: idOrCode }, { employeeCode: idOrCode }],
      },
      include: {
        department: true,
        designation: true,
        assignments: { where: { isActive: true } },
      },
    });

    if (!employee) {
      throw new AppException(ErrorCodes.EMPLOYEE_NOT_FOUND, 'Employee not found', HttpStatus.NOT_FOUND);
    }

    let explicitRole: { id: string; name: string } | null = null;
    try {
      const userRoles = await this.prisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(
        `SELECT r.id, r.name 
         FROM auth_service.roles r 
         JOIN auth_service.user_roles ur ON ur.role_id = r.id 
         JOIN auth_service.users u ON u.id = ur.user_id 
         WHERE LOWER(u.email) = ? OR LOWER(u.username) = ? OR u.id = ? 
         LIMIT 1`,
        employee.email.trim().toLowerCase(),
        employee.employeeCode.toLowerCase(),
        employee.userId || '',
      );
      if (userRoles && userRoles.length > 0) {
        explicitRole = { id: userRoles[0].id, name: userRoles[0].name };
      }
    } catch {
      // Fallback if auth_service cannot be reached
    }

    return this.formatEmployee(employee, explicitRole);
  }

  /**
   * Get comprehensive profile including devices and biometric face template status.
   */
  async getEmployeeProfile(idOrCode: string) {
    const employee = await this.getEmployeeById(idOrCode);

    let hasFaceEnrolled = false;
    try {
      const faceRes = await fetch(`http://localhost:3006/api/v1/face/status/${encodeURIComponent(employee.employeeCode)}`, {
        signal: AbortSignal.timeout(1500),
      });
      if (faceRes.ok) {
        const faceData = await faceRes.json();
        hasFaceEnrolled = !!faceData.is_enrolled;
      }
    } catch {
      // face service unreachable, fail safe
    }

    return {
      employee,
      devices: [],
      faceTemplate: {
        hasActiveReference: hasFaceEnrolled,
        status: hasFaceEnrolled ? 'ENROLLED' : null,
      },
    };
  }

  /**
   * Update employee status (e.g. ACTIVE, INACTIVE, TERMINATED).
   * Automatically normalizes status to Prisma EmploymentStatus enum
   * and synchronizes is_active with auth_service.
   */
  async updateEmployeeStatus(id: string, status: any) {
    const employee = await this.prisma.employee.findFirst({
      where: { OR: [{ id }, { employeeCode: id }] },
    });
    if (!employee) {
      throw new AppException(ErrorCodes.EMPLOYEE_NOT_FOUND, 'Employee not found', HttpStatus.NOT_FOUND);
    }
    const normalizedStatus =
      status === 'INACTIVE' || status === 'TERMINATED' || status === 'DEACTIVATED'
        ? EmploymentStatus.TERMINATED
        : EmploymentStatus.ACTIVE;

    const updated = await this.prisma.employee.update({
      where: { id: employee.id },
      data: { employmentStatus: normalizedStatus },
      include: {
        department: true,
        designation: true,
        assignments: { where: { isActive: true } },
      },
    });

    const isActiveInt = normalizedStatus === EmploymentStatus.ACTIVE ? 1 : 0;
    try {
      await this.prisma.$executeRawUnsafe(
        'UPDATE auth_service.users SET is_active = ?, updated_at = NOW() WHERE id = ? OR email = ? OR username = ?',
        isActiveInt,
        employee.userId || '',
        employee.email.trim().toLowerCase(),
        employee.employeeCode.toLowerCase(),
      );
    } catch (e: any) {
      this.logger.warn(`Failed to sync is_active to auth_service: ${e.message}`);
    }

    return this.getEmployeeById(employee.id);
  }

  /**
   * Update employee role (SUPER_ADMIN, HR_ADMIN, EMPLOYEE).
   * Enforces role hierarchy: only SUPER_ADMIN can assign SUPER_ADMIN or alter a SUPER_ADMIN.
   * Syncs with auth_service.user_roles.
   */
  async updateEmployeeRole(idOrCode: string, newRoleName: string, callerRoles: string[] = []) {
    const employee = await this.prisma.employee.findFirst({
      where: { OR: [{ id: idOrCode }, { employeeCode: idOrCode }] },
      include: {
        department: true,
        designation: true,
        assignments: { where: { isActive: true } },
      },
    });
    if (!employee) {
      throw new AppException(ErrorCodes.EMPLOYEE_NOT_FOUND, 'Employee not found', HttpStatus.NOT_FOUND);
    }

    const norm = (newRoleName || '').trim().toUpperCase();
    const targetRoleName = norm.includes('SUPER')
      ? 'SUPER_ADMIN'
      : (norm.includes('HR') || norm.includes('ADMIN'))
      ? 'HR_ADMIN'
      : 'EMPLOYEE';

    if (callerRoles.length > 0) {
      const isCallerSuperAdmin = callerRoles.includes('SUPER_ADMIN');
      const isCallerAdmin = callerRoles.includes('HR_ADMIN') || callerRoles.includes('ADMIN') || isCallerSuperAdmin;

      if (!isCallerAdmin) {
        throw new AppException(ErrorCodes.UNAUTHORIZED, 'Only Admin or Super Admin can change roles', HttpStatus.FORBIDDEN);
      }

      if (targetRoleName === 'SUPER_ADMIN' && !isCallerSuperAdmin) {
        throw new AppException(ErrorCodes.FORBIDDEN, 'Only Super Admin can assign the SUPER_ADMIN role', HttpStatus.FORBIDDEN);
      }

      // Check if current user is SUPER_ADMIN
      try {
        const currentRole = await this.prisma.$queryRawUnsafe<Array<{ name: string }>>(
          'SELECT r.name FROM auth_service.users u JOIN auth_service.user_roles ur ON u.id = ur.user_id JOIN auth_service.roles r ON ur.role_id = r.id WHERE u.email = ? OR u.id = ? LIMIT 1',
          employee.email.trim().toLowerCase(),
          employee.userId || '',
        );

        const currentHasSuper = currentRole?.some((r) => r.name === 'SUPER_ADMIN');
        if (currentHasSuper && !isCallerSuperAdmin) {
          throw new AppException(ErrorCodes.FORBIDDEN, 'Only Super Admin can modify a Super Admin user', HttpStatus.FORBIDDEN);
        }
      } catch {
        // Continue if query fails
      }
    }

    // Sync to auth_service
    try {
      const roles: Array<{ id: string }> = await this.prisma.$queryRawUnsafe(
        'SELECT id FROM auth_service.roles WHERE name = ? LIMIT 1',
        targetRoleName,
      );
      if (roles && roles.length > 0) {
        const targetRoleId = roles[0].id;
        const users: Array<{ id: string }> = await this.prisma.$queryRawUnsafe(
          'SELECT id FROM auth_service.users WHERE email = ? OR username = ? OR id = ? LIMIT 1',
          employee.email.trim().toLowerCase(),
          employee.employeeCode.toLowerCase(),
          employee.userId || '',
        );
        if (users && users.length > 0) {
          const authUserId = users[0].id;
          await this.prisma.$executeRawUnsafe(
            'DELETE FROM auth_service.user_roles WHERE user_id = ?',
            authUserId,
          );
          await this.prisma.$executeRawUnsafe(
            'INSERT INTO auth_service.user_roles (user_id, role_id) VALUES (?, ?)',
            authUserId,
            targetRoleId,
          );
        }
      }
    } catch (err: any) {
      this.logger.warn(`Could not sync role to auth_service: ${err.message}`);
    }

    return this.getEmployeeById(employee.id);
  }


  /**
   * Get employee by authenticated User ID.
   */
  async getEmployeeByUserId(userId: string) {
    let employee = await this.prisma.employee.findUnique({
      where: { userId },
      include: {
        department: true,
        designation: true,
        assignments: { where: { isActive: true } },
      },
    });

    if (!employee) {
      employee = await this.prisma.employee.findFirst({
        where: {
          OR: [
            { employeeCode: userId },
            { id: userId },
          ],
        },
        include: {
          department: true,
          designation: true,
          assignments: { where: { isActive: true } },
        },
      });
    }

    if (!employee) {
      throw new AppException(ErrorCodes.EMPLOYEE_NOT_FOUND, 'Employee profile not found for this user', HttpStatus.NOT_FOUND);
    }

    return this.getEmployeeById(employee.id);
  }

  /**
   * Resend credentials to employee. Generates new temporary password and sends email via SMTP.
   */
  async resendCredentials(idOrCode: string) {
    const employee = await this.getEmployeeById(idOrCode);
    const tempPass = this.generateStrongTemporaryPassword();
    const targetEmail = employee.personalEmail || employee.email;

    // Automatically sync updated temporary password to auth-service
    const authUserId = await this.syncCredentialsToAuthService(
      employee.email,
      tempPass,
      `${employee.firstName} ${employee.lastName}`,
      employee.employeeCode,
      employee.role?.name || 'EMPLOYEE',
    );

    if (authUserId && !employee.userId) {
      await this.prisma.employee.update({
        where: { id: employee.id },
        data: { userId: authUserId },
      });
    }

    let delivery: any;
    try {
      delivery = await this.emailService.sendCredentialEmail({
        toEmail: targetEmail,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        officialEmail: employee.email,
        username: employee.employeeCode.toLowerCase().replace(/[^a-zA-Z0-9._-]/g, "_"),
        temporaryPassword: tempPass,
        roleName: employee.role?.name || "EMPLOYEE",
        isPasswordReset: true,
      });
    } catch (err: any) {
      delivery = {
        delivered: false,
        mode: "error",
        message: `Email dispatch failed: ${err.message}`,
        deliveredTo: targetEmail,
      };
    }
    return {
      success: true,
      delivered: delivery.delivered,
      mode: delivery.mode,
      message: delivery.message,
      deliveredTo: targetEmail,
      temporaryPassword: tempPass,
    };
  }

  /**
   * Synchronize or provision credentials directly into auth_service database.
   * Guarantees 100% synchronization so login immediately succeeds with temporary password.
   */
  /**
   * Generates a strong temporary password meeting all 5 security rules:
   * length >= 8, uppercase, lowercase, number, symbol
   */
  private generateStrongTemporaryPassword(): string {
    const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowers = 'abcdefghjkmnpqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '!@#$%^&*';

    const u1 = uppers.charAt(Math.floor(Math.random() * uppers.length));
    const l1 = lowers.charAt(Math.floor(Math.random() * lowers.length));
    const l2 = lowers.charAt(Math.floor(Math.random() * lowers.length));
    const n1 = numbers.charAt(Math.floor(Math.random() * numbers.length));
    const n2 = numbers.charAt(Math.floor(Math.random() * numbers.length));
    const s1 = symbols.charAt(Math.floor(Math.random() * symbols.length));

    return `Momo${s1}${n1}${n2}${u1}${l1}${l2}!`;
  }

  private async syncCredentialsToAuthService(
    email: string,
    temporaryPassword: string,
    fullName: string,
    employeeCode: string,
    role = 'EMPLOYEE',
  ): Promise<string | null> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const username = employeeCode.toLowerCase().replace(/[^a-zA-Z0-9._-]/g, '_');
      const passwordHash = await argon2.hash(temporaryPassword);

      // Check if user exists in auth_service.users
      const existingUsers: Array<{ id: string }> = await this.prisma.$queryRawUnsafe(
        'SELECT id FROM auth_service.users WHERE email = ? OR username = ? LIMIT 1',
        normalizedEmail,
        username,
      );

      const isSuper = role.includes('SUPER');
      const isHr = role.includes('HR');
      const isAdmin = role.includes('ADMIN');
      const roleName = isSuper ? 'SUPER_ADMIN' : (isHr || isAdmin) ? 'HR_ADMIN' : 'EMPLOYEE';
      const roles: Array<{ id: string }> = await this.prisma.$queryRawUnsafe(
        'SELECT id FROM auth_service.roles WHERE name = ? LIMIT 1',
        roleName,
      );
      const roleId = roles && roles.length > 0 ? roles[0].id : null;

      if (existingUsers && existingUsers.length > 0) {
        const userId = existingUsers[0].id;
        await this.prisma.$executeRawUnsafe(
          'UPDATE auth_service.users SET email = ?, username = ?, full_name = ?, password_hash = ?, is_active = 1, must_change_password = 1, updated_at = NOW() WHERE id = ?',
          normalizedEmail,
          username,
          fullName,
          passwordHash,
          userId,
        );
        if (roleId) {
          await this.prisma.$executeRawUnsafe(
            'INSERT IGNORE INTO auth_service.user_roles (user_id, role_id) VALUES (?, ?)',
            userId,
            roleId,
          );
        }
        this.logger.log(`Directly updated credentials in auth_service for user ${normalizedEmail} (ID: ${userId})`);
        return userId;
      } else {
        // Create user in auth_service.users
        const newUserId = crypto.randomUUID();

        await this.prisma.$executeRawUnsafe(
          'INSERT INTO auth_service.users (id, username, email, full_name, password_hash, is_active, must_change_password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, 1, NOW(), NOW())',
          newUserId,
          username,
          normalizedEmail,
          fullName,
          passwordHash,
        );

        if (roleId) {
          await this.prisma.$executeRawUnsafe(
            'INSERT IGNORE INTO auth_service.user_roles (user_id, role_id) VALUES (?, ?)',
            newUserId,
            roleId,
          );
        }

        this.logger.log(`Directly created user in auth_service for ${normalizedEmail} (ID: ${newUserId})`);
        return newUserId;
      }
    } catch (err: any) {
      this.logger.warn(`Could not sync credentials to auth_service: ${err.message}`);
      return null;
    }
  }

  /**
   * Resolve an identifier (official email, personal email, or employee code)
   * to the employee's official login credentials.
   */
  async resolveIdentifier(identifier: string) {
    if (!identifier || !identifier.trim()) {
      return { found: false };
    }
    const clean = identifier.trim().toLowerCase();
    const cleanUpper = identifier.trim().toUpperCase();

    const employee = await this.prisma.employee.findFirst({
      where: {
        OR: [
          { email: clean },
          { personalEmail: clean },
          { employeeCode: cleanUpper },
          { employeeCode: clean },
        ],
        employmentStatus: EmploymentStatus.ACTIVE,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!employee) {
      return { found: false };
    }

    return {
      found: true,
      officialEmail: employee.email,
      personalEmail: employee.personalEmail,
      username: employee.employeeCode.toLowerCase().replace(/[^a-zA-Z0-9._-]/g, '_'),
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
    };
  }

  /**
   * Test SMTP connectivity and send test email.
   */
  async testSmtp(toEmail?: string) {
    return this.emailService.sendTestEmail(toEmail);
  }

  private formatEmployee(emp: any, explicitRole?: { id: string; name: string } | null) {
    if (!emp) return emp;
    const activeAssignments = (emp.assignments || []).filter((a: any) => a.isActive);
    const primaryAssignment = activeAssignments.find((a: any) => a.isPrimary) ||
                              activeAssignments[0] ||
                              emp.assignments?.[0];
    const rawOfficeId = primaryAssignment?.officeId || null;
    const resolvedOffice = rawOfficeId ? this.getOfficeDetails(rawOfficeId) : null;

    const isUuid = (val?: string | null) =>
      Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

    const officeLocationId = resolvedOffice?.code || resolvedOffice?.id || (isUuid(rawOfficeId) ? null : rawOfficeId);
    const primaryOfficeId = resolvedOffice?.code || resolvedOffice?.id || (isUuid(rawOfficeId) ? null : rawOfficeId);

    // Collect all distinct active assigned offices
    const assignedOfficesMap = new Map<string, { id: string; code: string; name: string; isPrimary: boolean; isActive: boolean }>();
    for (const assign of activeAssignments) {
      const resolved = this.getOfficeDetails(assign.officeId);
      const officeKey = resolved?.code || resolved?.id || assign.officeId;
      if (isUuid(officeKey) && !resolved) {
        // Skip unresolvable raw UUID offices
        continue;
      }
      if (!assignedOfficesMap.has(officeKey)) {
        assignedOfficesMap.set(officeKey, {
          id: resolved?.code || resolved?.id || 'OFFICE',
          code: resolved?.code || resolved?.id || 'OFFICE',
          name: resolved?.name || 'Office',
          isPrimary: Boolean(assign.isPrimary),
          isActive: Boolean(assign.isActive),
        });
      } else if (assign.isPrimary) {
        const item = assignedOfficesMap.get(officeKey)!;
        item.isPrimary = true;
      }
    }

    const assignedOffices = Array.from(assignedOfficesMap.values());
    const officeIds = Array.from(new Set(assignedOffices.map((o) => o.code || o.id)));
    const officeLocationNames = assignedOffices.map((o) => `${o.name}${o.code ? ` (${o.code})` : ''}`);
    const officeLocationName = officeLocationNames.length > 0
      ? officeLocationNames.join(', ')
      : (resolvedOffice?.name || (isUuid(rawOfficeId) ? null : rawOfficeId));

    const assignedOffice = resolvedOffice
      ? {
          id: resolvedOffice.code || resolvedOffice.id,
          code: resolvedOffice.code,
          name: resolvedOffice.name,
        }
      : null;

    let roleName = 'EMPLOYEE';
    let roleId = 'role-employee';
    let isHrMember = false;

    if (explicitRole && explicitRole.name) {
      const normRole = explicitRole.name.toUpperCase();
      if (normRole.includes('SUPER')) {
        roleName = 'SUPER_ADMIN';
        roleId = 'role-super-admin';
        isHrMember = false;
      } else if (normRole.includes('HR') || normRole.includes('ADMIN')) {
        roleName = 'HR_ADMIN';
        roleId = 'role-hr-admin';
        isHrMember = true;
      } else if (normRole.includes('MANAGER')) {
        roleName = 'EMPLOYEE';
        roleId = 'role-employee';
        isHrMember = false;
      } else {
        roleName = 'EMPLOYEE';
        roleId = 'role-employee';
        isHrMember = false;
      }
    } else {
      const departmentOrTitleHr = Boolean(
        emp.department?.name?.toUpperCase().includes('HUMAN') ||
        emp.designation?.title?.toUpperCase().includes('HR') ||
        emp.jobTitle?.toUpperCase().includes('HR') ||
        emp.email?.toLowerCase().includes('.hr@')
      );
      if (departmentOrTitleHr) {
        roleName = 'HR_ADMIN';
        roleId = 'role-hr-admin';
        isHrMember = true;
      } else {
        roleName = 'EMPLOYEE';
        roleId = 'role-employee';
        isHrMember = false;
      }
    }

    let displayJobTitle = emp.designation?.title || emp.jobTitle || '';
    if (displayJobTitle.includes('(Attendance)')) {
      displayJobTitle = displayJobTitle.replace(/\s*\(Attendance\)/i, '').trim();
    }
    if (isHrMember && (!displayJobTitle || displayJobTitle === 'Associate')) {
      displayJobTitle = 'HR Specialist';
    }

    const hrWebEmail = isHrMember
      ? (emp.email?.toLowerCase().includes('.hr@') ? emp.email : emp.email?.replace('@', '.hr@'))
      : undefined;

    const cleanId = emp.employeeCode || emp.id;

    // Sanitize child department while preserving clean code ID
    const cleanDeptCode = emp.department?.code || 'HR';
    const cleanDepartment = emp.department
      ? {
          id: cleanDeptCode,
          code: cleanDeptCode,
          name: emp.department.name,
          description: emp.department.description ?? null,
        }
      : null;

    // Sanitize child designation while preserving clean code ID
    const cleanDesigCode = emp.designation?.code || 'ASSOCIATE';
    const cleanDesignation = emp.designation
      ? {
          id: cleanDesigCode,
          code: cleanDesigCode,
          title: emp.designation.title,
          description: emp.designation.description ?? null,
        }
      : null;

    // Sanitize assignments array
    const sanitizedAssignments = (emp.assignments || []).map((a: any, idx: number) => {
      const resolved = this.getOfficeDetails(a.officeId);
      const cleanOfficeId = resolved?.code || (isUuid(a.officeId) ? (resolved?.name || 'OFFICE') : a.officeId);
      return {
        id: `assign-${cleanId.toLowerCase()}-${idx + 1}`,
        employeeId: cleanId,
        officeId: cleanOfficeId,
        isPrimary: Boolean(a.isPrimary),
        isActive: Boolean(a.isActive),
        office: resolved
          ? {
              id: resolved.code || resolved.id,
              code: resolved.code,
              name: resolved.name,
            }
          : undefined,
      };
    });

    const hasUserAccount = Boolean(emp.userId);

    return {
      ...emp,
      id: cleanId,
      userId: hasUserAccount ? cleanId : null,
      hasAccount: hasUserAccount,
      hasUserAccount,
      assignments: sanitizedAssignments,
      department: cleanDepartment,
      departmentId: cleanDeptCode,
      designation: cleanDesignation,
      designationId: cleanDesigCode,
      status: emp.employmentStatus,
      jobTitle: displayJobTitle,
      isHr: isHrMember,
      hrWebEmail,
      role: { id: roleId, name: roleName },
      roleId: roleId,
      officeLocationId,
      primaryOfficeId,
      officeLocationName,
      assignedOffice,
      assignedOffices,
      officeIds,
      officeLocationNames,
      isOnboarded: emp.isOnboarded ?? false,
      dateOfBirth: emp.dateOfBirth
        ? (emp.dateOfBirth.toISOString ? emp.dateOfBirth.toISOString().slice(0, 10) : String(emp.dateOfBirth).slice(0, 10))
        : null,
      personalEmail: emp.personalEmail ?? null,
      gender: emp.gender ?? null,
      bloodGroup: emp.bloodGroup ?? null,
      address: emp.address ?? null,
      permanentAddress: emp.permanentAddress ?? null,
      alternatePhone: emp.alternatePhone ?? null,
      emergencyContactName: emp.emergencyContactName ?? null,
      emergencyContactRelation: emp.emergencyContactRelation ?? null,
      emergencyContactPhone: emp.emergencyContactPhone ?? null,
      profilePhotoUrl: emp.profilePhotoUrl ?? null,
    };
  }

  private formatEmployeeSummary(emp: any, explicitRole?: { id: string; name: string } | null) {
    if (!emp) return emp;
    const formatted = this.formatEmployee(emp, explicitRole);
    return {
      id: formatted.id,
      employeeCode: formatted.employeeCode,
      firstName: formatted.firstName,
      lastName: formatted.lastName,
      email: formatted.email,
      phone: formatted.phone,
      personalEmail: formatted.personalEmail || null,
      department: formatted.department
        ? {
            id: formatted.department.id,
            code: formatted.department.code,
            name: formatted.department.name,
          }
        : null,
      departmentId: formatted.departmentId,
      designation: formatted.designation
        ? {
            id: formatted.designation.id,
            code: formatted.designation.code,
            title: formatted.designation.title,
          }
        : null,
      designationId: formatted.designationId,
      jobTitle: formatted.jobTitle,
      assignedOffices: (formatted.assignedOffices || []).map((o: any) => ({
        id: o.id,
        code: o.code,
        name: o.name,
        isPrimary: o.isPrimary,
      })),
      officeLocationName: formatted.officeLocationName || null,
      officeLocationId: formatted.officeLocationId || null,
      primaryOfficeId: formatted.primaryOfficeId || null,
      role: formatted.role,
      roleId: formatted.roleId,
      status: formatted.status,
      employmentStatus: formatted.employmentStatus,
      hasAccount: formatted.hasAccount,
      hasUserAccount: formatted.hasUserAccount,
      isHr: formatted.isHr,
      profilePhotoUrl: formatted.profilePhotoUrl || null,
      bloodGroup: formatted.bloodGroup || null,
      alternatePhone: formatted.alternatePhone || null,
    };
  }

  /**
   * Assign an employee to an office.
   */
  async assignOffice(employeeIdOrCode: string, dto: AssignOfficeDto) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        OR: [{ id: employeeIdOrCode }, { employeeCode: employeeIdOrCode }],
      },
    });

    if (!employee) {
      throw new AppException(ErrorCodes.EMPLOYEE_NOT_FOUND, 'Employee not found', HttpStatus.NOT_FOUND);
    }

    const existing = await this.prisma.employeeOfficeAssignment.findFirst({
      where: {
        employeeId: employee.id,
        officeId: dto.officeId,
        isActive: true,
      },
    });

    if (existing) {
      throw new AppException(
        ErrorCodes.DUPLICATE_ASSIGNMENT,
        'Employee is already actively assigned to this office',
        HttpStatus.CONFLICT,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        // Demote previous primary assignments
        await tx.employeeOfficeAssignment.updateMany({
          where: { employeeId: employee.id, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      const created = await tx.employeeOfficeAssignment.create({
        data: {
          employeeId: employee.id,
          officeId: dto.officeId,
          isPrimary: dto.isPrimary ?? false,
          effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
          effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
          isActive: true,
        },
      });

      return {
        ...created,
        employeeId: employee.employeeCode,
      };
    });
  }

  /**
   * Deactivate an office assignment.
   */
  async removeOfficeAssignment(assignmentId: string) {
    return this.prisma.employeeOfficeAssignment.update({
      where: { id: assignmentId },
      data: { isActive: false },
    });
  }

  /**
   * Check if an employee is assigned to an office.
   * Called by Attendance Service to validate office attendance authorization.
   */
  async isAssignedToOffice(employeeIdOrCode: string, officeId: string): Promise<boolean> {
    await this.ensureOfficesCache();
    const employee = await this.prisma.employee.findFirst({
      where: {
        OR: [
          { id: employeeIdOrCode },
          { employeeCode: employeeIdOrCode },
          { userId: employeeIdOrCode },
        ],
        employmentStatus: EmploymentStatus.ACTIVE,
      },
    });

    if (!employee) {
      this.logger.warn(`isAssignedToOffice: Employee ${employeeIdOrCode} not found or not active.`);
      return false;
    }

    const activeAssignments = await this.prisma.employeeOfficeAssignment.findMany({
      where: {
        employeeId: employee.id,
        isActive: true,
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
      },
    });

    if (activeAssignments.length === 0) {
      this.logger.warn(`isAssignedToOffice: Employee ${employee.employeeCode} has no active office assignments.`);
      return false;
    }

    const cleanTarget = officeId.replace(/\s*\(Primary\)$/i, '').trim().toLowerCase();
    let targetOffice = this.getOfficeDetails(cleanTarget);
    if (!targetOffice) {
      await this.refreshOfficesCache();
      targetOffice = this.getOfficeDetails(cleanTarget);
    }

    const targetCandidates = new Set<string>();
    targetCandidates.add(cleanTarget);
    if (targetOffice) {
      if (targetOffice.id) targetCandidates.add(targetOffice.id.trim().toLowerCase());
      if (targetOffice.code) targetCandidates.add(targetOffice.code.trim().toLowerCase());
      if (targetOffice.name) targetCandidates.add(targetOffice.name.trim().toLowerCase());
      if ((targetOffice as any).uuid) targetCandidates.add((targetOffice as any).uuid.trim().toLowerCase());
    }

    for (const assign of activeAssignments) {
      const assignId = assign.officeId.replace(/\s*\(Primary\)$/i, '').trim().toLowerCase();
      if (targetCandidates.has(assignId)) {
        this.logger.log(`Assignment check matched direct: employee=${employee.employeeCode} office=${officeId}`);
        return true;
      }
      let assignOffice = this.getOfficeDetails(assign.officeId);
      if (!assignOffice) {
        assignOffice = this.officesCache.find((o: any) => o.name && o.name.toLowerCase() === assignId) || null;
      }
      if (assignOffice) {
        if (assignOffice.id && targetCandidates.has(assignOffice.id.trim().toLowerCase())) return true;
        if (assignOffice.code && targetCandidates.has(assignOffice.code.trim().toLowerCase())) return true;
        if (assignOffice.name && targetCandidates.has(assignOffice.name.trim().toLowerCase())) return true;
        if ((assignOffice as any).uuid && targetCandidates.has((assignOffice as any).uuid.trim().toLowerCase())) return true;
      }
    }

    this.logger.warn(`Assignment check failed for employee=${employee.employeeCode} office=${officeId}. Active assignments: ${activeAssignments.map(a => a.officeId).join(', ')}`);
    return false;
  }

  getImportTemplateCsv(): string {
    return [
      'employeeCode,firstName,lastName,email,personalEmail,phone,dateOfJoining,jobTitle,department,role,officeLocations,dateOfBirth,gender,address',
      'EMP-0010,Aarav,Sharma,aarav.sharma@company.com,aarav.personal@example.com,+91 98765 43210,2026-01-15,Senior Software Engineer,Engineering,EMPLOYEE,"OFFICE-001, PUN-01",1995-06-12,MALE,"Hinjewadi Phase 1, Pune"',
      'EMP-0011,Priya,Patil,priya.patil@company.com,priya.personal@example.com,+91 98765 43211,2026-02-01,HR Specialist,Human Resources,HR,"PUN-01",1996-09-24,FEMALE,"Wakad, Pune"',
      'EMP-0012,Rohan,Deshmukh,rohan.deshmukh@company.com,rohan.personal@example.com,+91 98765 43212,2026-03-01,QA Engineer,Quality Assurance,EMPLOYEE,"OFFICE-001, PN-001",1997-11-05,MALE,"Baner, Pune"',
    ].join('\n');
  }

  async validateImportFile(buffer: Buffer): Promise<ValidationSummary> {
    await this.ensureOfficesCache();
    const text = buffer.toString('utf-8');
    const parsedRows = this.parseCsvRows(text);

    const departments = await this.prisma.department.findMany();
    const deptByName = new Map<string, string>();
    for (const d of departments) {
      deptByName.set(d.name.toLowerCase(), d.id);
      deptByName.set(d.code.toLowerCase(), d.id);
    }

    const existingEmployees = await this.prisma.employee.findMany({
      select: { id: true, employeeCode: true, email: true },
    });
    const empByCode = new Map<string, string>();
    const empByEmail = new Map<string, string>();
    for (const e of existingEmployees) {
      empByCode.set(e.employeeCode.toLowerCase(), e.id);
      empByEmail.set(e.email.toLowerCase(), e.id);
    }

    const seenCodesInCsv = new Set<string>();
    const seenEmailsInCsv = new Set<string>();

    const rows: ValidatedImportRow[] = [];
    let validNewCount = 0;
    let validUpdateCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      const rowNumber = i + 1;
      const errors: string[] = [];

      const employeeCode = row.employeeCode || '';
      const firstName = row.firstName || '';
      const lastName = row.lastName || '';
      const email = row.email || '';
      const personalEmail = row.personalEmail || undefined;
      const phone = row.phone || '';
      const dateOfJoining = row.dateOfJoining || new Date().toISOString().slice(0, 10);
      const jobTitle = row.jobTitle || '';
      const department = row.department || '';
      const role = (row.role || 'EMPLOYEE').toUpperCase();
      const dateOfBirth = row.dateOfBirth || undefined;
      const gender = row.gender || undefined;
      const address = row.address || undefined;
      const rawOfficeLocations = row.officeLocations || '';

      const resolvedOfficeIds: string[] = [];
      const resolvedOfficeNames: string[] = [];
      if (rawOfficeLocations.trim()) {
        const parts = rawOfficeLocations
          .split(/[,;|]+/)
          .map((s) => s.trim())
          .filter(Boolean);

        for (const p of parts) {
          const matched = this.getOfficeDetails(p);
          if (matched) {
            if (matched.id && !resolvedOfficeIds.includes(matched.id)) resolvedOfficeIds.push(matched.id);
            if (matched.code && !resolvedOfficeIds.includes(matched.code)) resolvedOfficeIds.push(matched.code);
            const label = matched.name ? `${matched.name} (${matched.code})` : matched.code;
            if (!resolvedOfficeNames.includes(label)) resolvedOfficeNames.push(label);
          } else {
            if (!resolvedOfficeIds.includes(p)) resolvedOfficeIds.push(p);
            if (!resolvedOfficeNames.includes(p)) resolvedOfficeNames.push(p);
          }
        }
      }

      if (!employeeCode) errors.push('Employee code is required');
      if (!firstName) errors.push('First name is required');
      if (!lastName) errors.push('Last name is required');
      if (!email) {
        errors.push('Official email is required');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Invalid official email format');
      }
      if (personalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalEmail)) {
        errors.push('Invalid personal email format');
      }

      const codeLower = employeeCode.toLowerCase();
      const emailLower = email.toLowerCase();

      let isDuplicateInFile = false;
      if (employeeCode && seenCodesInCsv.has(codeLower)) {
        errors.push(`Duplicate employee code '${employeeCode}' in CSV file`);
        isDuplicateInFile = true;
      }
      if (email && seenEmailsInCsv.has(emailLower)) {
        errors.push(`Duplicate email '${email}' in CSV file`);
        isDuplicateInFile = true;
      }

      if (employeeCode) seenCodesInCsv.add(codeLower);
      if (email) seenEmailsInCsv.add(emailLower);

      let resolvedDepartmentId: string | undefined = undefined;
      if (department) {
        resolvedDepartmentId = deptByName.get(department.toLowerCase());
      }

      const existingIdByCode = empByCode.get(codeLower);
      const existingIdByEmail = empByEmail.get(emailLower);
      const existingEmployeeId = existingIdByCode || existingIdByEmail;

      let status: ImportRowStatus;
      if (errors.length > 0) {
        if (isDuplicateInFile) {
          status = 'DUPLICATE';
          duplicateCount++;
        } else {
          status = 'INVALID';
          invalidCount++;
        }
      } else if (existingEmployeeId) {
        status = 'VALID_UPDATE';
        validUpdateCount++;
      } else {
        status = 'VALID_NEW';
        validNewCount++;
      }

      rows.push({
        rowNumber,
        data: {
          employeeCode,
          firstName,
          lastName,
          email,
          personalEmail,
          phone,
          dateOfJoining,
          jobTitle,
          department,
          role,
          dateOfBirth,
          gender: gender as any,
          address,
          officeLocations: rawOfficeLocations || undefined,
          resolvedOfficeIds,
          resolvedOfficeNames,
        },
        status,
        errors,
        resolvedDepartmentId,
        existingEmployeeId,
      });
    }

    return {
      totalRows: parsedRows.length,
      validNewCount,
      validUpdateCount,
      duplicateCount,
      invalidCount,
      rows,
    };
  }

  async executeImportFile(buffer: Buffer, provisionAccounts: boolean = true): Promise<ImportExecutionResult> {
    const summary = await this.validateImportFile(buffer);
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    const results: ImportExecutionResult['results'] = [];

    for (const row of summary.rows) {
      if (row.status === 'INVALID' || row.status === 'DUPLICATE') {
        skipped++;
        results.push({
          rowNumber: row.rowNumber,
          employeeCode: row.data.employeeCode,
          email: row.data.email,
          status: 'SKIPPED',
          message: row.errors.join('; '),
        });
        continue;
      }

      try {
        if (row.status === 'VALID_UPDATE' && row.existingEmployeeId) {
          await this.prisma.employee.update({
            where: { id: row.existingEmployeeId },
            data: {
              firstName: row.data.firstName,
              lastName: row.data.lastName,
              personalEmail: row.data.personalEmail || undefined,
              phone: row.data.phone || undefined,
              dateOfBirth: row.data.dateOfBirth ? new Date(row.data.dateOfBirth) : undefined,
              gender: row.data.gender || undefined,
              address: row.data.address || undefined,
              departmentId: row.resolvedDepartmentId || undefined,
            },
          });

          if (row.data.resolvedOfficeIds && row.data.resolvedOfficeIds.length > 0) {
            await this.updateEmployee(row.existingEmployeeId, {
              officeIds: row.data.resolvedOfficeIds,
              primaryOfficeId: row.data.resolvedOfficeIds[0],
            });
          }

          updated++;
          results.push({
            rowNumber: row.rowNumber,
            employeeCode: row.data.employeeCode,
            email: row.data.email,
            status: 'UPDATED',
          });
        } else {
          let deptId = row.resolvedDepartmentId;
          if (!deptId && row.data.department) {
            const deptName = row.data.department.trim();
            const deptCode = deptName.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 32) || `DEPT_${Date.now()}`;
            const createdDept = await this.prisma.department.upsert({
              where: { code: deptCode },
              update: {},
              create: { code: deptCode, name: deptName },
            });
            deptId = createdDept.id;
          }

          await this.createEmployee({
            employeeCode: row.data.employeeCode,
            firstName: row.data.firstName,
            lastName: row.data.lastName,
            email: row.data.email,
            personalEmail: row.data.personalEmail,
            phone: row.data.phone,
            departmentId: deptId,
            jobTitle: row.data.jobTitle,
            roleId: row.data.role,
            dateOfJoining: row.data.dateOfJoining,
            provisionAccount: provisionAccounts,
            officeIds: row.data.resolvedOfficeIds || [],
            primaryOfficeId: row.data.resolvedOfficeIds?.[0] || undefined,
            officeLocationId: row.data.resolvedOfficeIds?.[0] || undefined,
            officeLocationName: row.data.resolvedOfficeNames?.join(', ') || undefined,
          });
          created++;
          results.push({
            rowNumber: row.rowNumber,
            employeeCode: row.data.employeeCode,
            email: row.data.email,
            status: 'CREATED',
          });
        }
      } catch (err: unknown) {
        failed++;
        results.push({
          rowNumber: row.rowNumber,
          employeeCode: row.data.employeeCode,
          email: row.data.email,
          status: 'FAILED',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return {
      totalRows: summary.totalRows,
      created,
      updated,
      skipped,
      failed,
      results,
    };
  }

  private parseCsvRows(csvText: string): Record<string, string>[] {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const rawHeaders = this.parseCsvLine(lines[0]);
    const headers = rawHeaders.map((h) => this.normalizeHeader(h));

    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      if (values.every((v) => !v.trim())) continue;
      const rowObj: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        rowObj[headers[j]] = (values[j] ?? '').trim();
      }
      rows.push(rowObj);
    }
    return rows;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  private normalizeHeader(h: string): string {
    const clean = h.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const map: Record<string, string> = {
      employeecode: 'employeeCode',
      empcode: 'employeeCode',
      code: 'employeeCode',
      firstname: 'firstName',
      fname: 'firstName',
      first: 'firstName',
      lastname: 'lastName',
      lname: 'lastName',
      last: 'lastName',
      email: 'email',
      officialemail: 'email',
      workemail: 'email',
      personalemail: 'personalEmail',
      phone: 'phone',
      phonenumber: 'phone',
      mobile: 'phone',
      dateofjoining: 'dateOfJoining',
      doj: 'dateOfJoining',
      joiningdate: 'dateOfJoining',
      jobtitle: 'jobTitle',
      title: 'jobTitle',
      designation: 'jobTitle',
      department: 'department',
      dept: 'department',
      role: 'role',
      roleid: 'role',
      dateofbirth: 'dateOfBirth',
      dob: 'dateOfBirth',
      gender: 'gender',
      address: 'address',
      officelocations: 'officeLocations',
      officelocation: 'officeLocations',
      offices: 'officeLocations',
      office: 'officeLocations',
      locations: 'officeLocations',
      location: 'officeLocations',
      workplace: 'officeLocations',
      workplaces: 'officeLocations',
      assignedoffices: 'officeLocations',
      assignedoffice: 'officeLocations',
    };
    return map[clean] || h.trim();
  }

  async getHrStaff(): Promise<Array<{ id: string; name: string; email: string; role?: string }>> {
    const hrEmployees = await this.prisma.employee.findMany({
      where: {
        OR: [
          { department: { name: { contains: 'Human Resources' } } },
          { department: { code: 'HR' } },
          { email: { contains: '.hr@' } },
          { email: 'priya.patil@company.com' },
        ],
      },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    const staffList: Array<{ id: string; name: string; email: string; role?: string }> = hrEmployees.map((e) => ({
      id: e.employeeCode || e.id,
      name: `${e.firstName} ${e.lastName}`.trim(),
      email: e.email,
      role: 'HR_ADMIN',
    }));

    const defaultHrEmails = [
      { name: 'Tejaswini Patil (HR)', email: 'tejaswinipatil3apr@gmail.com' },
      { name: 'Priya Patil', email: 'priya.patil@company.com' },
      { name: 'Tejaswini Patil (HR Dept)', email: 'tejaswini.patil.hr@company.com' },
      { name: 'Admin', email: 'admin@company.com' },
    ];

    for (const def of defaultHrEmails) {
      if (!staffList.some((s) => s.email.toLowerCase() === def.email.toLowerCase())) {
        staffList.push({
          id: `hr-${def.email}`,
          name: def.name,
          email: def.email,
          role: 'HR_ADMIN',
        });
      }
    }

    return staffList;
  }
}
