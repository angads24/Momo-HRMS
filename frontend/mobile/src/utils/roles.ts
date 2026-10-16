import type { AppRole, AuthUser, BackendUser } from '../types/auth';

/** Role names exactly as stored by the backend (auth-service seed). */
export const BACKEND_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  HR_ADMIN: 'HR_ADMIN',
  EMPLOYEE: 'EMPLOYEE',
} as const;

/**
 * Backend role -> frontend module.
 * A user can hold several roles, so the highest one wins:
 * SUPER_ADMIN -> ADMIN, HR_ADMIN -> HR, EMPLOYEE -> EMPLOYEE.
 * Custom roles created later (unknown names) return null = no module access.
 */
export function resolveAppRole(roles?: readonly string[] | null): AppRole | null {
  if (!roles || !Array.isArray(roles)) return null;
  if (roles.includes(BACKEND_ROLES.SUPER_ADMIN)) return 'ADMIN';
  if (roles.includes(BACKEND_ROLES.HR_ADMIN)) return 'HR';
  if (roles.includes(BACKEND_ROLES.EMPLOYEE)) return 'EMPLOYEE';
  return null;
}

export function toAuthUser(user?: BackendUser | null): AuthUser {
  if (!user || typeof user !== 'object') {
    return {
      id: '',
      email: '',
      username: '',
      fullName: '',
      roles: [],
      permissions: [],
      mustChangePassword: false,
      appRole: null,
    };
  }

  const roles = Array.isArray(user.roles) ? user.roles : [];
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];

  return {
    id: user.id || '',
    email: user.email || '',
    username: user.username || '',
    fullName: user.fullName || '',
    roles,
    permissions,
    mustChangePassword: Boolean(user.mustChangePassword),
    appRole: resolveAppRole(roles),
  };
}

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: 'Admin',
  HR: 'HR',
  EMPLOYEE: 'Employee',
};
