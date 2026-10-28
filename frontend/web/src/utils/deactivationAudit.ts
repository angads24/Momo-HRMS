import type { AuthUser } from '../types/auth';
import type { Employee } from '../types/employee';

export interface DeactivationRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  email: string;
  departmentName: string;
  jobTitle: string;
  officeLocationName: string;
  deactivatedAt: string;
  deactivatedBy: string;
  deactivatedByRole: 'ADMIN' | 'HR';
  deactivatedByEmail: string;
  reason: string;
  status: 'TERMINATED' | 'INACTIVE';
}

const STORAGE_KEY = 'hrms_deactivated_employees_audit';

export function getDeactivationRecords(): DeactivationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDeactivationRecords(records: DeactivationRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn('Could not persist deactivation audit records to localStorage:', err);
  }
}

export function recordDeactivation({
  employee,
  currentUser,
  reason,
}: {
  employee: Partial<Employee> & { id: string };
  currentUser: AuthUser | null;
  reason?: string;
}): DeactivationRecord {
  const records = getDeactivationRecords();

  const isHr = currentUser?.appRole === 'HR';
  const roleName = isHr ? 'HR' : 'Admin';
  const userIdentifier = currentUser?.email || currentUser?.username || 'Staff';
  const authorLabel = `${roleName} (${userIdentifier})`;

  const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee';
  const departmentName = employee.department?.name || employee.department?.code || 'General';
  const jobTitle = employee.jobTitle || 'Associate';
  const officeLocationName =
    employee.officeLocationName ||
    employee.assignedOffice?.name ||
    employee.assignedOffices?.[0]?.name ||
    'Pune Headquarters';

  const newRecord: DeactivationRecord = {
    id: `deact-${Date.now()}-${employee.id}`,
    employeeId: employee.id,
    employeeCode: employee.employeeCode || employee.id,
    employeeName,
    email: employee.email || '—',
    departmentName,
    jobTitle,
    officeLocationName,
    deactivatedAt: new Date().toISOString(),
    deactivatedBy: authorLabel,
    deactivatedByRole: isHr ? 'HR' : 'ADMIN',
    deactivatedByEmail: currentUser?.email || '',
    reason: reason?.trim() || 'Administrative deactivation',
    status: 'TERMINATED',
  };

  // Remove any previous existing record for this employee and prepend the latest
  const filtered = records.filter(
    (r) => r.employeeId !== employee.id && r.employeeCode !== employee.employeeCode,
  );
  const updated = [newRecord, ...filtered];
  saveDeactivationRecords(updated);

  return newRecord;
}

export function recordReactivation(employeeId: string, _currentUser: AuthUser | null): void {
  const records = getDeactivationRecords();
  const filtered = records.filter((r) => r.employeeId !== employeeId);
  saveDeactivationRecords(filtered);
}

/**
 * Combines explicitly logged deactivation audit events with any inactive
 * employees returned from the backend so that the report stays comprehensive.
 */
export function getUnifiedDeactivatedRecords(serverEmployees: Employee[] = []): DeactivationRecord[] {
  const localRecords = getDeactivationRecords();
  const knownIds = new Set(localRecords.map((r) => r.employeeId));
  const knownCodes = new Set(localRecords.map((r) => r.employeeCode));

  const synthesized: DeactivationRecord[] = [];

  for (const emp of serverEmployees) {
    const isInactive = emp.status === 'TERMINATED' || emp.status === 'INACTIVE';
    if (isInactive && !knownIds.has(emp.id) && !knownCodes.has(emp.employeeCode)) {
      synthesized.push({
        id: `server-deact-${emp.id}`,
        employeeId: emp.id,
        employeeCode: emp.employeeCode || emp.id,
        employeeName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Employee',
        email: emp.email || '—',
        departmentName: emp.department?.name || emp.department?.code || 'General',
        jobTitle: emp.jobTitle || 'Associate',
        officeLocationName: emp.officeLocationName || 'Pune Headquarters',
        deactivatedAt: (emp as any).updatedAt || new Date().toISOString(),
        deactivatedBy: 'Admin (System)',
        deactivatedByRole: 'ADMIN',
        deactivatedByEmail: 'admin@company.com',
        reason: 'Organization inactive / terminated record',
        status: emp.status === 'TERMINATED' ? 'TERMINATED' : 'INACTIVE',
      });
    }
  }

  return [...localRecords, ...synthesized];
}
