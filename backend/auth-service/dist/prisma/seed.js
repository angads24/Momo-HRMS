"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const argon2 = __importStar(require("argon2"));
const prisma = new client_1.PrismaClient();
const PERMISSIONS = [
    { name: 'employee.view', description: 'View employee profiles' },
    { name: 'employee.create', description: 'Create employee profiles' },
    { name: 'employee.update', description: 'Update employee profiles' },
    { name: 'employee.delete', description: 'Delete employee profiles' },
    { name: 'attendance.view_own', description: 'View own attendance records' },
    { name: 'attendance.check_in', description: 'Check in for attendance' },
    { name: 'attendance.check_out', description: 'Check out for attendance' },
    { name: 'attendance.view', description: 'View attendance records for others' },
    { name: 'attendance.manage', description: 'Manage/edit attendance records' },
    { name: 'geofence.view', description: 'View geofences' },
    { name: 'geofence.create', description: 'Create geofences' },
    { name: 'geofence.update', description: 'Update geofences' },
    { name: 'report.view', description: 'View reports' },
    { name: 'audit.view', description: 'View audit logs' },
    { name: 'role.manage', description: 'Manage roles and role-permission mappings' },
    { name: 'auth.manage', description: 'Manage authentication/authorization configuration' },
];
const ROLE_PERMISSIONS = {
    EMPLOYEE: ['attendance.view_own', 'attendance.check_in', 'attendance.check_out'],
    HR_ADMIN: [
        'employee.view',
        'employee.create',
        'employee.update',
        'attendance.view',
        'attendance.manage',
        'geofence.view',
        'geofence.create',
        'geofence.update',
        'report.view',
        'audit.view',
    ],
    SUPER_ADMIN: [...PERMISSIONS.map((p) => p.name)],
};
const ROLE_DESCRIPTIONS = {
    EMPLOYEE: 'Standard employee with self-service attendance access',
    HR_ADMIN: 'HR administrator with employee and attendance management access',
    SUPER_ADMIN: 'Full system access, including role and auth management',
};
async function main() {
    console.log('Seeding permissions...');
    for (const permission of PERMISSIONS) {
        await prisma.permission.upsert({
            where: { name: permission.name },
            update: { description: permission.description },
            create: permission,
        });
    }
    console.log('Seeding roles...');
    for (const roleName of Object.keys(ROLE_PERMISSIONS)) {
        await prisma.role.upsert({
            where: { name: roleName },
            update: { description: ROLE_DESCRIPTIONS[roleName] },
            create: { name: roleName, description: ROLE_DESCRIPTIONS[roleName] },
        });
    }
    console.log('Wiring role -> permission mappings...');
    for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
        const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
        for (const permissionName of permissionNames) {
            const permission = await prisma.permission.findUniqueOrThrow({
                where: { name: permissionName },
            });
            await prisma.rolePermission.upsert({
                where: {
                    roleId_permissionId: { roleId: role.id, permissionId: permission.id },
                },
                update: {},
                create: { roleId: role.id, permissionId: permission.id },
            });
        }
    }
    const bootstrapEmail = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL || "admin@company.com";
    const bootstrapUsername = process.env.BOOTSTRAP_SUPER_ADMIN_USERNAME || "admin";
    const bootstrapPassword = process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD || "Admin123!";
    if (bootstrapEmail && bootstrapUsername && bootstrapPassword) {
        const normalizedEmail = bootstrapEmail.trim().toLowerCase();
        const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        const passwordHash = await argon2.hash(bootstrapPassword);
        const superAdminRole = await prisma.role.findUniqueOrThrow({
            where: { name: 'SUPER_ADMIN' },
        });
        if (!existing) {
            console.log(`Bootstrapping initial SUPER_ADMIN user: ${normalizedEmail} (username: ${bootstrapUsername})`);
            const user = await prisma.user.create({
                data: {
                    username: bootstrapUsername,
                    email: normalizedEmail,
                    passwordHash,
                    isActive: true,
                    mustChangePassword: false,
                },
            });
            await prisma.userRole.create({
                data: { userId: user.id, roleId: superAdminRole.id },
            });
        }
        else {
            console.log(`Updating existing SUPER_ADMIN user: ${normalizedEmail} with new credentials`);
            await prisma.user.update({
                where: { id: existing.id },
                data: {
                    username: bootstrapUsername,
                    passwordHash,
                    isActive: true,
                    mustChangePassword: false,
                },
            });
            await prisma.userRole.upsert({
                where: { userId_roleId: { userId: existing.id, roleId: superAdminRole.id } },
                update: {},
                create: { userId: existing.id, roleId: superAdminRole.id },
            });
        }
    }
    else {
        console.log('BOOTSTRAP_SUPER_ADMIN_* env vars not fully set — skipping initial admin bootstrap.');
    }
    const hrEmail = (process.env.BOOTSTRAP_HR_EMAIL || 'hr@company.com').trim().toLowerCase();
    const hrUsername = (process.env.BOOTSTRAP_HR_USERNAME || 'hradmin').trim();
    const hrPassword = process.env.BOOTSTRAP_HR_PASSWORD || 'HrAdmin123!';
    const existingHr = await prisma.user.findUnique({ where: { email: hrEmail } });
    const hrPasswordHash = await argon2.hash(hrPassword);
    const hrRole = await prisma.role.findUniqueOrThrow({
        where: { name: 'HR_ADMIN' },
    });
    if (!existingHr) {
        console.log(`Bootstrapping initial HR_ADMIN user: ${hrEmail} (username: ${hrUsername})`);
        const hrUser = await prisma.user.create({
            data: {
                username: hrUsername,
                email: hrEmail,
                passwordHash: hrPasswordHash,
                isActive: true,
                mustChangePassword: false,
            },
        });
        await prisma.userRole.create({
            data: { userId: hrUser.id, roleId: hrRole.id },
        });
    }
    else {
        console.log(`Updating existing HR_ADMIN user: ${hrEmail} with password`);
        await prisma.user.update({
            where: { id: existingHr.id },
            data: {
                username: hrUsername,
                passwordHash: hrPasswordHash,
                isActive: true,
                mustChangePassword: false,
            },
        });
        await prisma.userRole.upsert({
            where: { userId_roleId: { userId: existingHr.id, roleId: hrRole.id } },
            update: {},
            create: { userId: existingHr.id, roleId: hrRole.id },
        });
    }
    const empEmail = 'john.doe@company.com';
    const empUsername = 'john.doe';
    const empPassword = 'Employee123!';
    const existingEmp = await prisma.user.findUnique({ where: { email: empEmail } });
    const empPasswordHash = await argon2.hash(empPassword);
    const empRole = await prisma.role.findUniqueOrThrow({
        where: { name: 'EMPLOYEE' },
    });
    if (!existingEmp) {
        console.log(`Bootstrapping initial EMPLOYEE user: ${empEmail}`);
        const empUser = await prisma.user.create({
            data: {
                username: empUsername,
                email: empEmail,
                passwordHash: empPasswordHash,
                isActive: true,
                mustChangePassword: false,
            },
        });
        await prisma.userRole.create({
            data: { userId: empUser.id, roleId: empRole.id },
        });
    }
    else {
        console.log(`Updating existing EMPLOYEE user: ${empEmail}`);
        await prisma.user.update({
            where: { id: existingEmp.id },
            data: {
                username: empUsername,
                passwordHash: empPasswordHash,
                isActive: true,
                mustChangePassword: false,
            },
        });
        await prisma.userRole.upsert({
            where: { userId_roleId: { userId: existingEmp.id, roleId: empRole.id } },
            update: {},
            create: { userId: existingEmp.id, roleId: empRole.id },
        });
    }
    console.log('Seed complete.');
}
main()
    .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map