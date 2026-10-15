import type { AuthUser } from '../types/auth';
import type { Employee } from '../types/employee';
import type { Office } from '../features/geofence/types/geofence';
import { fetchEmployeeMe, fetchEmployees } from '../services/employeeService';

export interface OfficeIdentifier {
  id: string;
  code?: string;
  name?: string;
}

/**
 * Checks whether an employee belongs to a specific office by inspecting:
 * 1. officeLocationId
 * 2. primaryOfficeId
 * 3. officeIds array
 * 4. assignedOffices array
 * 5. assignments array
 * 6. officeLocationName string matching
 */
export function isEmployeeInOffice(
  employee: Employee,
  office: OfficeIdentifier
): boolean {
  if (!employee || !office) return false;

  const offId = (office.id || '').trim().toLowerCase();
  const offCode = (office.code || '').trim().toLowerCase();
  const offName = (office.name || '').trim().toLowerCase();

  // 1. Direct officeLocationId check
  if (employee.officeLocationId) {
    const loc = employee.officeLocationId.trim().toLowerCase();
    if (loc === offId || (offCode && loc === offCode)) {
      return true;
    }
  }

  // 2. primaryOfficeId check
  if (employee.primaryOfficeId) {
    const prim = employee.primaryOfficeId.trim().toLowerCase();
    if (prim === offId || (offCode && prim === offCode)) {
      return true;
    }
  }

  // 3. officeIds array check
  if (Array.isArray(employee.officeIds) && employee.officeIds.length > 0) {
    const hasMatch = employee.officeIds.some((id) => {
      const lower = id.trim().toLowerCase();
      return lower === offId || (offCode && lower === offCode);
    });
    if (hasMatch) return true;
  }

  // 4. assignedOffices array check
  if (Array.isArray(employee.assignedOffices) && employee.assignedOffices.length > 0) {
    const hasMatch = employee.assignedOffices.some((ao) => {
      const aoId = (ao.id || '').trim().toLowerCase();
      const aoCode = (ao.code || '').trim().toLowerCase();
      const aoName = (ao.name || '').trim().toLowerCase();
      return (
        aoId === offId ||
        (offCode && (aoId === offCode || aoCode === offCode)) ||
        (offName && (aoName === offName || aoName.includes(offName) || offName.includes(aoName)))
      );
    });
    if (hasMatch) return true;
  }

  // 5. Raw assignments array check
  const rawAssignments = (employee as any).assignments;
  if (Array.isArray(rawAssignments) && rawAssignments.length > 0) {
    const hasMatch = rawAssignments.some((a: any) => {
      const aOffId = (a.officeId || a.office?.id || '').trim().toLowerCase();
      const aOffCode = (a.office?.code || '').trim().toLowerCase();
      return (
        aOffId === offId ||
        (offCode && (aOffId === offCode || aOffCode === offCode))
      );
    });
    if (hasMatch) return true;
  }

  // 6. Name string fuzzy match
  if (employee.officeLocationName && typeof employee.officeLocationName === 'string') {
    const locLower = employee.officeLocationName.toLowerCase();
    if (
      (offName && locLower.includes(offName)) ||
      (offCode && locLower.includes(offCode))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Checks whether an employee belongs to ANY of the given offices.
 * If office list is empty, returns true (no filter).
 */
export function isEmployeeInAnyOffice(
  employee: Employee,
  offices: OfficeIdentifier[]
): boolean {
  if (!offices || offices.length === 0) return true;
  return offices.some((off) => isEmployeeInOffice(employee, off));
}

export interface HrOfficeScopeResult {
  hrEmployee: Employee | null;
  assignedOffices: Office[];
  isScoped: boolean;
  jurisdictionLabel: string;
}

/**
 * Resolves the logged-in user's office scope.
 * - For ADMIN: Returns isScoped = false, all offices available.
 * - For HR: Resolves the HR employee profile and limits assignedOffices strictly to the HR's office(s).
 */
let cachedHrEmp: { userId: string; emp: Employee | null; exp: number } | null = null;

export async function resolveHrOfficeScope(
  user: AuthUser | null,
  allOffices: Office[]
): Promise<HrOfficeScopeResult> {
  // If not HR, global visibility
  if (!user || user.appRole !== 'HR') {
    return {
      hrEmployee: null,
      assignedOffices: allOffices,
      isScoped: false,
      jurisdictionLabel: 'All Offices (Organization-Wide)',
    };
  }

  try {
    const now = Date.now();
    let hrEmp: Employee | null = null;
    if (cachedHrEmp && cachedHrEmp.userId === user.id && cachedHrEmp.exp > now) {
      hrEmp = cachedHrEmp.emp;
    } else {
      // 1. Cleanly resolve the current HR user profile via /employees/me without exposing raw auth UUID in request URL
      hrEmp = await fetchEmployeeMe();

      // 2. If not found via /employees/me, lookup by email (supporting .hr suffix variations)
      if (!hrEmp) {
        const hrEmail = user.email.toLowerCase();
        const cleanEmail = hrEmail.replace(/\.hr\d*(?=@|$)/i, '');
        const res = await fetchEmployees({ search: cleanEmail });
        const list = Array.isArray(res.data) ? res.data : [];
        hrEmp =
          list.find(
            (e) =>
              e.email?.toLowerCase() === hrEmail ||
              e.email?.toLowerCase() === cleanEmail
          ) ||
          list[0] ||
          null;
      }
      cachedHrEmp = { userId: user.id, emp: hrEmp, exp: now + 5 * 60 * 1000 };
    }

    if (hrEmp) {
      // Find matching offices in allOffices
      const matched = allOffices.filter((off) => isEmployeeInOffice(hrEmp!, off));

      if (matched.length > 0) {
        return {
          hrEmployee: hrEmp,
          assignedOffices: matched,
          isScoped: true,
          jurisdictionLabel: matched.map((o) => `${o.name} (${o.code})`).join(', '),
        };
      }

      // If hrEmp has assignedOffices not yet in allOffices list
      if (Array.isArray(hrEmp.assignedOffices) && hrEmp.assignedOffices.length > 0) {
        const virtualOffices: Office[] = hrEmp.assignedOffices.map((ao) => ({
          id: ao.id,
          code: ao.code || ao.id,
          name: ao.name,
          isActive: true,
        }));
        return {
          hrEmployee: hrEmp,
          assignedOffices: virtualOffices,
          isScoped: true,
          jurisdictionLabel: virtualOffices.map((o) => `${o.name} (${o.code})`).join(', '),
        };
      }

      // Fallback by officeLocationName
      if (hrEmp.officeLocationName) {
        const nameMatches = allOffices.filter(
          (o) =>
            hrEmp!.officeLocationName!.toLowerCase().includes(o.name.toLowerCase()) ||
            hrEmp!.officeLocationName!.toLowerCase().includes(o.code.toLowerCase())
        );
        if (nameMatches.length > 0) {
          return {
            hrEmployee: hrEmp,
            assignedOffices: nameMatches,
            isScoped: true,
            jurisdictionLabel: nameMatches.map((o) => `${o.name} (${o.code})`).join(', '),
          };
        }
      }
    }
  } catch (err) {
    console.warn('Could not resolve HR office scope from employee service:', err);
  }

  return {
    hrEmployee: null,
    assignedOffices: allOffices,
    isScoped: false,
    jurisdictionLabel: 'All Offices',
  };
}

export const resolveHrAssignedOffices = resolveHrOfficeScope;

