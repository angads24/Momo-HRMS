import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DashboardLayout } from '../../../components/DashboardLayout';
import { LoadingIndicator } from '../../../components/LoadingIndicator';
import { useAuth } from '../../../context/AuthContext';
import { PATHS } from '../../../routes/paths';
import { getErrorMessage } from '../../../utils/errors';
import {
  fetchActiveDepartments,
  fetchEmployeeById,
  fetchRoles,
  updateEmployee,
  updateEmployeeRole,
} from '../../../services/employeeService';
import { fetchOffices } from '../../geofence/services/geofenceService';
import type { Office } from '../../geofence/types/geofence';
import type {
  CreateEmployeePayload,
  Department,
  Employee,
  Role,
} from '../../../types/employee';
import { EmployeeForm } from '../components/EmployeeForm';

export default function EditEmployeePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setNotice } = useAuth();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    Promise.all([
      fetchEmployeeById(id),
      fetchActiveDepartments(),
      fetchRoles(),
      fetchOffices(),
    ])
      .then(([empData, deptsData, rolesData, officesData]) => {
        if (mounted) {
          setEmployee(empData);
          setDepartments(deptsData);
          setRoles(
            Array.isArray(rolesData)
              ? rolesData.filter(
                  (r) =>
                    r.name?.toUpperCase() !== 'MANAGER' &&
                    (r as any).code?.toUpperCase() !== 'MANAGER' &&
                    r.id !== 'role-manager'
                )
              : []
          );
          setOffices(Array.isArray(officesData) ? officesData : []);
        }
      })
      .catch((err) => {
        console.error('Failed to load employee for edit:', err);
        setServerError(
          getErrorMessage(err, 'Unable to load employee details, departments, or office locations.')
        );
      })
      .finally(() => {
        if (mounted) setLoadingInitial(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  const handleSubmit = async (values: CreateEmployeePayload) => {
    if (!id || !employee) return;
    setSubmitting(true);
    setServerError(null);

    try {
      // Update employee profile details including office location and role
      await updateEmployee(id, {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        personalEmail: values.personalEmail ? values.personalEmail.trim() : null,
        phone: values.phone,
        alternatePhone: values.alternatePhone ? values.alternatePhone.trim() : null,
        bloodGroup: values.bloodGroup ? values.bloodGroup.trim() : null,
        jobTitle: values.jobTitle,
        departmentId: values.departmentId,
        roleId: values.roleId,
        dateOfJoining: values.dateOfJoining,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth : null,
        gender: values.gender ?? null,
        address: values.address?.trim() ? values.address.trim() : null,
        profilePhotoUrl: values.profilePhotoUrl?.trim() ? values.profilePhotoUrl.trim() : null,
        officeLocationId: values.officeLocationId ?? null,
        officeLocationName: values.officeLocationName ?? null,
        primaryOfficeId: values.primaryOfficeId ?? null,
        officeIds: values.officeIds ?? [],
      });

      if (values.roleId) {
        await updateEmployeeRole(id, values.roleId).catch(() => {});
      }

      if (values.documentsDriveLink !== undefined) {
        let link = values.documentsDriveLink.trim();
        if (link && !/^https?:\/\//i.test(link)) {
          link = `https://${link}`;
        }
        const keys = [employee.id, employee.employeeCode, id].filter(Boolean) as string[];
        for (const k of keys) {
          if (link) {
            localStorage.setItem(`hrms_emp_doc_drive_${k}`, link);
          } else {
            localStorage.removeItem(`hrms_emp_doc_drive_${k}`);
          }
        }
      }

      setNotice(`Employee profile for "${values.firstName} ${values.lastName}" updated successfully.`);
      navigate(PATHS.employeeDetails(id));
    } catch (err: unknown) {
      let msg = 'Failed to update employee details.';
      if (axios.isAxiosError(err)) {
        const resError = err.response?.data?.error as { code?: string; message?: string; details?: Array<{ path: string; message: string }> } | undefined;
        if (resError?.code === 'DUPLICATE_VALUE' || err.response?.status === 409) {
          msg = 'An employee with this email address already exists.';
        } else if (resError?.details && Array.isArray(resError.details)) {
          msg = resError.details.map((d) => `${d.path}: ${d.message}`).join(', ');
        } else if (resError?.message) {
          msg = resError.message;
        }
      }
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <DashboardLayout title="Edit Employee" subtitle="Loading employee details...">
        <LoadingIndicator message="Loading employee information..." />
      </DashboardLayout>
    );
  }

  if (!employee) {
    return (
      <DashboardLayout title="Edit Employee" subtitle="Error">
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(PATHS.employees)}
          >
            Back to Employee List
          </Button>
        </Box>
      </DashboardLayout>
    );
  }

  const resolvedRoleId = (() => {
    const roleName = employee.role?.name?.toUpperCase();
    if (roleName === 'SUPER_ADMIN') return 'role-super-admin';
    if (roleName === 'HR_ADMIN' || roleName === 'HR') return 'role-hr-admin';
    if (roleName === 'MANAGER') return 'role-employee';
    if (roleName === 'EMPLOYEE') return 'role-employee';
    if (employee.roleId && employee.roleId.startsWith('role-') && employee.roleId !== 'role-manager') return employee.roleId;
    if (employee.role?.id && employee.role.id.startsWith('role-') && employee.role.id !== 'role-manager') return employee.role.id;
    return 'role-employee';
  })();

  const initialValues: Partial<CreateEmployeePayload> = {
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    personalEmail: employee.personalEmail ?? '',
    phone: employee.phone,
    alternatePhone: employee.alternatePhone ?? '',
    bloodGroup: employee.bloodGroup ?? '',
    jobTitle: employee.jobTitle,
    departmentId: (employee as any).departmentId || employee.department?.id || '',
    roleId: resolvedRoleId,
    officeLocationId:
      employee.officeLocationId ??
      employee.assignedOffice?.id ??
      employee.assignedOffice?.code ??
      employee.assignments?.find((a) => a.isPrimary)?.officeId ??
      '',
    officeLocationName:
      employee.officeLocationName ??
      employee.assignedOffice?.name ??
      '',
    primaryOfficeId:
      employee.primaryOfficeId ??
      employee.officeLocationId ??
      employee.assignedOffice?.id ??
      '',
    officeIds:
      employee.assignedOffices && employee.assignedOffices.length > 0
        ? employee.assignedOffices.map((o) => o.id)
        : employee.assignments && employee.assignments.length > 0
        ? employee.assignments.map((a) => a.officeId)
        : employee.officeLocationId
        ? [employee.officeLocationId]
        : [],
    dateOfJoining: employee.dateOfJoining
      ? (employee.dateOfJoining.includes('T') ? employee.dateOfJoining.slice(0, 10) : employee.dateOfJoining)
      : new Date().toISOString().slice(0, 10),
    dateOfBirth: employee.dateOfBirth
      ? (employee.dateOfBirth.includes('T') ? employee.dateOfBirth.slice(0, 10) : employee.dateOfBirth)
      : '',
    gender: employee.gender ?? undefined,
    address: employee.address ?? '',
    profilePhotoUrl: employee.profilePhotoUrl ?? '',
    documentsDriveLink:
      (employee.id && localStorage.getItem(`hrms_emp_doc_drive_${employee.id}`)) ||
      (employee.employeeCode && localStorage.getItem(`hrms_emp_doc_drive_${employee.employeeCode}`)) ||
      (id && localStorage.getItem(`hrms_emp_doc_drive_${id}`)) ||
      '',
  };

  return (
    <DashboardLayout
      title={`Edit: ${employee.firstName} ${employee.lastName}`}
      subtitle={`Employee Code: ${employee.employeeCode}`}
    >
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          color="inherit"
          onClick={() => navigate(PATHS.employeeDetails(employee.id))}
        >
          Back to Details
        </Button>
      </Box>

      <EmployeeForm
        mode="edit"
        initialValues={initialValues}
        departments={departments}
        roles={roles}
        offices={offices}
        onSubmit={handleSubmit}
        onCancel={() => navigate(PATHS.employeeDetails(employee.id))}
        loading={submitting}
        serverError={serverError}
      />
    </DashboardLayout>
  );
}
