import { api } from './client';

export interface Department {
  id: string;
  code: string;
  name: string;
  description?: string;
  designations?: Designation[];
}

export interface Designation {
  id: string;
  code: string;
  title: string;
  departmentId?: string;
}

export interface OfficeAssignment {
  id: string;
  officeId: string;
  isPrimary: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
}

export interface Employee {
  id: string;
  employeeCode: string;
  userId?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  departmentId?: string | null;
  designationId?: string | null;
  employmentStatus: 'ACTIVE' | 'PROBATION' | 'ON_LEAVE' | 'TERMINATED';
  dateOfJoining: string;
  createdAt: string;
  updatedAt: string;
  department?: Department | null;
  designation?: Designation | null;
  assignments?: OfficeAssignment[];
}

export interface EmployeeListResponse {
  items: Employee[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateEmployeePayload {
  employeeCode: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  departmentId?: string;
  designationId?: string;
  primaryOfficeId?: string;
  officeIds?: string[];
  employmentStatus?: 'ACTIVE' | 'PROBATION' | 'ON_LEAVE' | 'TERMINATED';
  dateOfJoining?: string;
}

export interface AssignOfficePayload {
  officeId: string;
  isPrimary?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export const employeeApi = {
  async listEmployees(params?: {
    page?: number;
    limit?: number;
    search?: string;
    departmentId?: string;
    officeId?: string;
    status?: string;
  }): Promise<EmployeeListResponse> {
    const res = await api.get<{ success: boolean; data: EmployeeListResponse }>('/employees', { params });
    return res.data.data;
  },

  async getEmployee(idOrCode: string): Promise<Employee> {
    const res = await api.get<{ success: boolean; data: Employee }>(`/employees/${idOrCode}`);
    return res.data.data;
  },

  async getByUser(userId: string): Promise<Employee> {
    const res = await api.get<{ success: boolean; data: Employee }>(`/employees/by-user/${userId}`);
    return res.data.data;
  },

  async createEmployee(payload: CreateEmployeePayload): Promise<Employee> {
    const res = await api.post<{ success: boolean; data: Employee; message: string }>('/employees', payload);
    return res.data.data;
  },

  async updateEmployee(id: string, payload: Partial<CreateEmployeePayload>): Promise<Employee> {
    const res = await api.patch<{ success: boolean; data: Employee; message: string }>(`/employees/${id}`, payload);
    return res.data.data;
  },

  async updateStatus(id: string, status: string): Promise<Employee> {
    const res = await api.patch<{ success: boolean; data: Employee; message: string }>(`/employees/${id}/status`, { status });
    return res.data.data;
  },

  async updateRole(id: string, role: string): Promise<Employee> {
    const res = await api.patch<{ success: boolean; data: Employee; message: string }>(`/employees/${id}/role`, { role });
    return res.data.data;
  },

  async deleteEmployee(id: string): Promise<void> {
    await api.delete(`/employees/${id}`);
  },

  async assignOffice(employeeId: string, payload: AssignOfficePayload): Promise<OfficeAssignment> {
    const res = await api.post<{ success: boolean; data: OfficeAssignment; message: string }>(
      `/employees/${employeeId}/offices`,
      payload,
    );
    return res.data.data;
  },

  async removeOfficeAssignment(assignmentId: string): Promise<void> {
    await api.delete(`/employees/offices/${assignmentId}`);
  },

  async listDepartments(): Promise<Department[]> {
    const res = await api.get<{ success: boolean; data: Department[] }>('/organization/departments');
    return res.data.data;
  },

  async createDepartment(payload: { code: string; name: string; description?: string }): Promise<Department> {
    const res = await api.post<{ success: boolean; data: Department }>('/organization/departments', payload);
    return res.data.data;
  },

  async listDesignations(departmentId?: string): Promise<Designation[]> {
    const res = await api.get<{ success: boolean; data: Designation[] }>('/organization/designations', {
      params: { departmentId },
    });
    return res.data.data;
  },

  async createDesignation(payload: { code: string; title: string; departmentId: string }): Promise<Designation> {
    const res = await api.post<{ success: boolean; data: Designation }>('/organization/designations', payload);
    return res.data.data;
  },
};
