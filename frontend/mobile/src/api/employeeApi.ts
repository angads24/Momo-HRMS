import { api } from './client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Office {
  id: string;
  name: string;
  address?: string;
}

export interface EmployeeAssignment {
  id: string;
  officeId: string;
  officeName?: string;
  isPrimary?: boolean;
  isActive: boolean;
  startDate: string;
}

export interface Employee {
  id: string;
  userId?: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  isActive: boolean;
  hireDate: string;
  assignments?: EmployeeAssignment[];
}

export interface EmployeeListResponse {
  items: Employee[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Helper to unwrap { success: true, data: T } envelope from employee-service
function unwrap<T>(resData: any): T {
  if (resData && typeof resData === 'object' && 'data' in resData && resData.data !== undefined) {
    return resData.data as T;
  }
  return resData as T;
}

// ─── Employee API ─────────────────────────────────────────────────────────────

export async function getMyProfile(userId: string): Promise<Employee> {
  const { data } = await api.get(`/employees/by-user/${userId}`);
  return unwrap<Employee>(data);
}

export async function listEmployees(params?: {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}): Promise<EmployeeListResponse> {
  const { data } = await api.get('/employees', { params });
  return unwrap<EmployeeListResponse>(data);
}

export async function getEmployee(id: string): Promise<Employee> {
  const { data } = await api.get(`/employees/${id}`);
  return unwrap<Employee>(data);
}

export async function updateEmployee(id: string, payload: Partial<Pick<Employee, 'fullName' | 'phone' | 'department' | 'jobTitle' | 'isActive'>>): Promise<Employee> {
  const { data } = await api.patch(`/employees/${id}`, payload);
  return unwrap<Employee>(data);
}

export async function deleteEmployee(id: string): Promise<void> {
  await api.delete(`/employees/${id}`);
}

export async function toggleEmployeeStatus(id: string, isActive: boolean): Promise<Employee> {
  return updateEmployee(id, { isActive });
}
