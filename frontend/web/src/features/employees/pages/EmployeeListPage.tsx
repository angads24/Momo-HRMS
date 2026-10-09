import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { DashboardLayout } from '../../../components/DashboardLayout';
import { useAuth } from '../../../context/AuthContext';
import { PATHS } from '../../../routes/paths';
import {
  changeEmployeeStatus,
  fetchActiveDepartments,
  fetchEmployees,
  fetchRoles,
  resendCredentials,
} from '../../../services/employeeService';
import { fetchOffices } from '../../geofence/services/geofenceService';
import type { Office } from '../../geofence/types/geofence';
import {
  isEmployeeInAnyOffice,
  isEmployeeInOffice,
  resolveHrAssignedOffices,
} from '../../../utils/officeJurisdiction';
import type {
  Department,
  Employee,
  EmployeeListQuery,
  EmploymentStatus,
  PageMeta,
  Role,
} from '../../../types/employee';
import { EmployeeFilters } from '../components/EmployeeFilters';
import { EmployeeTable } from '../components/EmployeeTable';

export default function EmployeeListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.appRole === 'ADMIN';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [meta, setMeta] = useState<PageMeta>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter dropdown data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  // HR Office Jurisdiction Scope State
  const [isHrScoped, setIsHrScoped] = useState(false);
  const [hrJurisdictionLabel, setHrJurisdictionLabel] = useState('');
  const [hrOffices, setHrOffices] = useState<Office[]>([]);

  // Filter state
  const [allOffices, setAllOffices] = useState<Office[]>([]);
  const [officeId, setOfficeId] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [status, setStatus] = useState('');

  // Debounce search input by 300ms to allow smooth typing without input focus disruption
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Status toggle modal
  const [statusTarget, setStatusTarget] = useState<Employee | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Load dropdown options & resolve HR scope once
  useEffect(() => {
    let mounted = true;
    Promise.all([fetchActiveDepartments(), fetchRoles(), fetchOffices()])
      .then(async ([deptsData, rolesData, officesData]) => {
        if (!mounted) return;
        setDepartments(deptsData);
        setRoles(rolesData);
        setAllOffices(officesData as any);

        const hrScope = await resolveHrAssignedOffices(user, officesData as any);
        if (mounted && user?.appRole === 'HR' && hrScope.isScoped) {
          setIsHrScoped(true);
          setHrJurisdictionLabel(hrScope.jurisdictionLabel);
          setHrOffices(hrScope.assignedOffices);
        }
      })
      .catch((err: unknown) => {
        console.error('Failed to load filter options or office jurisdiction:', err);
      });
    return () => {
      mounted = false;
    };
  }, [user]);

  // Fetch employees
  const loadEmployees = useCallback(
    async (pageToLoad = meta.page, limitToLoad = meta.limit) => {
      setLoading(true);
      setError(null);
      try {
        const query: EmployeeListQuery = {
          page: pageToLoad,
          limit: limitToLoad,
          search: debouncedSearch || undefined,
          departmentId: departmentId || undefined,
          roleId: roleId || undefined,
          status: (status as EmploymentStatus) || undefined,
          officeId: officeId || (isHrScoped && hrOffices.length === 1 ? hrOffices[0].id : undefined),
        };
        const res = await fetchEmployees(query);
        let list = Array.isArray(res.data) ? res.data : [];
        let nextMeta = res.meta;

        if (officeId) {
          const targetOff = allOffices.find((o) => o.id === officeId || o.code === officeId);
          if (targetOff) {
            list = list.filter((emp) => isEmployeeInOffice(emp, targetOff));
            nextMeta = { ...res.meta, total: list.length };
          }
        } else if (isHrScoped && hrOffices.length > 0) {
          list = list.filter((emp) => isEmployeeInAnyOffice(emp, hrOffices));
          nextMeta = { ...res.meta, total: list.length };
        }

        setEmployees(list);
        setMeta(nextMeta);
      } catch (err: unknown) {
        const msg =
          axios.isAxiosError(err) && err.response?.data?.error?.message
            ? err.response.data.error.message
            : 'Unable to load employees. Please try again.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [meta.page, meta.limit, debouncedSearch, departmentId, roleId, status, officeId, allOffices, isHrScoped, hrOffices],
  );

  useEffect(() => {
    let active = true;
    const fetchFiltered = async () => {
      setLoading(true);
      setError(null);
      try {
        const query: EmployeeListQuery = {
          page: 1,
          limit: meta.limit,
          search: debouncedSearch || undefined,
          departmentId: departmentId || undefined,
          roleId: roleId || undefined,
          status: (status as EmploymentStatus) || undefined,
          officeId: officeId || (isHrScoped && hrOffices.length === 1 ? hrOffices[0].id : undefined),
        };
        const res = await fetchEmployees(query);
        if (active) {
          let list = Array.isArray(res.data) ? res.data : [];
          let nextMeta = res.meta;

          if (officeId) {
            const targetOff = allOffices.find((o) => o.id === officeId || o.code === officeId);
            if (targetOff) {
              list = list.filter((emp) => isEmployeeInOffice(emp, targetOff));
              nextMeta = { ...res.meta, total: list.length };
            }
          } else if (isHrScoped && hrOffices.length > 0) {
            list = list.filter((emp) => isEmployeeInAnyOffice(emp, hrOffices));
            nextMeta = { ...res.meta, total: list.length };
          }

          setEmployees(list);
          setMeta(nextMeta);
        }
      } catch (err: unknown) {
        if (active) {
          const msg =
            axios.isAxiosError(err) && err.response?.data?.error?.message
              ? err.response.data.error.message
              : 'Unable to load employees. Please try again.';
          setError(msg);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchFiltered();

    return () => {
      active = false;
    };
  }, [debouncedSearch, departmentId, roleId, status, officeId, allOffices, meta.limit, isHrScoped, hrOffices]);

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setDepartmentId('');
    setRoleId('');
    setStatus('');
    setOfficeId('');
  };

  const handleStatusToggleSubmit = async () => {
    if (!statusTarget) return;

    const nextStatus = statusTarget.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setStatusSubmitting(true);
    try {
      await changeEmployeeStatus(statusTarget.id, {
        status: nextStatus,
        reason: statusReason.trim() || undefined,
      });
      setFeedback(
        `Employee "${statusTarget.firstName} ${statusTarget.lastName}" marked as ${nextStatus.toLowerCase()}.`,
      );
      setStatusTarget(null);
      setStatusReason('');
      await loadEmployees(meta.page, meta.limit);
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error?.message
          ? err.response.data.error.message
          : 'Failed to update employee status.';
      setError(msg);
    } finally {
      setStatusSubmitting(false);
    }
  };

  const handleResendCredentials = async (employee: Employee) => {
    try {
      const res = await resendCredentials(employee.id);
      setFeedback(res.message || `Credentials sent to ${res.deliveredTo}`);
      loadEmployees();
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error?.message
          ? err.response.data.error.message
          : 'Failed to dispatch credentials. Please try again.';
      setError(msg);
    }
  };

  return (
    <DashboardLayout
      title="Employee Management"
      subtitle="View, search, filter, and manage employee profiles and employment status."
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          color="inherit"
          onClick={() => navigate(user?.appRole === 'HR' ? PATHS.hr : PATHS.admin)}
        >
          Back to {user?.appRole === 'ADMIN' ? 'Admin Dashboard' : 'Dashboard'}
        </Button>
        {isAdmin && (
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              onClick={() => navigate(PATHS.importEmployees)}
            >
              Bulk Import
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate(PATHS.addEmployee)}
            >
              Add Employee
            </Button>
          </Box>
        )}
      </Box>

      {/* Office Jurisdiction Scope Banner (for HR users) */}
      {isHrScoped && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2.5,
            bgcolor: 'rgba(156, 39, 176, 0.04)',
            border: '1px solid',
            borderColor: 'rgba(156, 39, 176, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: 'rgba(156, 39, 176, 0.12)',
                color: 'secondary.main',
                display: 'flex',
              }}
            >
              <LocationOnIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Office Jurisdiction: {hrJurisdictionLabel}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
                Displaying staff members assigned to your workplace office jurisdiction only.
              </Typography>
            </Box>
          </Box>
          <Chip
            icon={<LocationOnIcon fontSize="small" />}
            label="Workplace Scoped"
            color="secondary"
            size="small"
            sx={{ fontWeight: 600, height: 26 }}
          />
        </Paper>
      )}

      <EmployeeFilters
        search={search}
        onSearchChange={setSearch}
        departmentId={departmentId}
        onDepartmentChange={setDepartmentId}
        roleId={roleId}
        onRoleChange={setRoleId}
        status={status}
        onStatusChange={setStatus}
        officeId={officeId}
        onOfficeChange={setOfficeId}
        departments={departments}
        roles={roles}
        offices={allOffices}
        onReset={handleResetFilters}
        loading={loading}
      />

      <EmployeeTable
        employees={employees}
        meta={meta}
        loading={loading}
        error={error}
        canManage={isAdmin}
        onPageChange={(page) => loadEmployees(page, meta.limit)}
        onRowsPerPageChange={(limit) => {
          setMeta((prev) => ({ ...prev, limit, page: 1 }));
          loadEmployees(1, limit);
        }}
        onView={(id) => navigate(PATHS.employeeDetails(id))}
        onEdit={(id) => navigate(PATHS.editEmployee(id))}
        onToggleStatus={(emp) => {
          setStatusTarget(emp);
          setStatusReason('');
        }}
        onResendCredentials={handleResendCredentials}
        onRetry={() => loadEmployees(meta.page, meta.limit)}
      />

      {/* Confirmation Dialog for Status Change */}
      <Dialog
        open={Boolean(statusTarget)}
        onClose={() => !statusSubmitting && setStatusTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {statusTarget?.status === 'ACTIVE' ? 'Deactivate Employee' : 'Activate Employee'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {statusTarget?.status === 'ACTIVE'
              ? `Are you sure you want to deactivate ${statusTarget?.firstName} ${statusTarget?.lastName} (${statusTarget?.employeeCode})? Deactivated employees will be blocked from attendance and system actions.`
              : `Are you sure you want to reactivate ${statusTarget?.firstName} ${statusTarget?.lastName} (${statusTarget?.employeeCode})? This will restore their active status in the organization.`}
          </DialogContentText>

          {statusTarget?.status === 'ACTIVE' && (
            <TextField
              label="Deactivation Reason (Optional)"
              multiline
              rows={2}
              fullWidth
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="e.g. Resigned, sabbatical, contract ended..."
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setStatusTarget(null)}
            color="inherit"
            disabled={statusSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleStatusToggleSubmit}
            color={statusTarget?.status === 'ACTIVE' ? 'error' : 'success'}
            variant="contained"
            disabled={statusSubmitting}
          >
            {statusSubmitting
              ? 'Updating...'
              : statusTarget?.status === 'ACTIVE'
              ? 'Confirm Deactivation'
              : 'Confirm Activation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Snackbar */}
      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={4000}
        onClose={() => setFeedback(null)}
      >
        <Alert severity="success" onClose={() => setFeedback(null)} variant="filled">
          {feedback}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
