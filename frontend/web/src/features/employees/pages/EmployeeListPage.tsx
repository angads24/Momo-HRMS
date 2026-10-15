import { useCallback, useEffect, useMemo, useState } from 'react';
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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
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
  PageMeta,
  Role,
} from '../../../types/employee';
import { EmployeeFilters } from '../components/EmployeeFilters';
import { EmployeeTable } from '../components/EmployeeTable';

export default function EmployeeListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.appRole === 'ADMIN';

  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
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

  // Debounce search input by 200ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);
    return () => clearTimeout(handler);
  }, [search]);

  // Status toggle modal
  const [statusTarget, setStatusTarget] = useState<Employee | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [resetCredsDialog, setResetCredsDialog] = useState<{
    open: boolean;
    employeeName?: string;
    email: string;
    temporaryPassword?: string;
    message: string;
  } | null>(null);

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

  // Fetch all employees at once without pagination query limit
  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchEmployees();
      const list = Array.isArray(res.data) ? res.data : [];
      setAllEmployees(list);
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error?.message
          ? err.response.data.error.message
          : 'Unable to load employees. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  // In-memory client-side filtering
  const filteredEmployees = useMemo(() => {
    let list = allEmployees;

    if (officeId) {
      const targetOff = allOffices.find((o) => o.id === officeId || o.code === officeId);
      if (targetOff) {
        list = list.filter((emp) => isEmployeeInOffice(emp, targetOff));
      }
    } else if (isHrScoped && hrOffices.length > 0) {
      list = list.filter((emp) => isEmployeeInAnyOffice(emp, hrOffices));
    }

    if (departmentId) {
      list = list.filter(
        (emp) => emp.department?.id === departmentId,
      );
    }

    if (roleId) {
      list = list.filter(
        (emp) => emp.role?.id === roleId,
      );
    }

    if (status) {
      list = list.filter((emp) => emp.status === status);
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      list = list.filter((emp) => {
        const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
        const code = (emp.employeeCode || '').toLowerCase();
        const email = (emp.email || '').toLowerCase();
        return fullName.includes(q) || code.includes(q) || email.includes(q);
      });
    }

    return list;
  }, [allEmployees, officeId, allOffices, isHrScoped, hrOffices, departmentId, roleId, status, debouncedSearch]);

  // Reset to first page whenever filter inputs change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, departmentId, roleId, status, officeId]);

  const total = filteredEmployees.length;
  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));

  // Client-side slice for current page
  const displayedEmployees = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredEmployees.slice(start, start + rowsPerPage);
  }, [filteredEmployees, page, rowsPerPage]);

  const meta: PageMeta = useMemo(
    () => ({
      page,
      limit: rowsPerPage,
      total,
      totalPages,
    }),
    [page, rowsPerPage, total, totalPages],
  );

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
      await loadEmployees();
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
      if (res?.temporaryPassword) {
        setResetCredsDialog({
          open: true,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          email: employee.email || res.deliveredTo || '',
          temporaryPassword: res.temporaryPassword,
          message: res.message || `Credentials dispatched to ${res.deliveredTo || employee.email}`,
        });
      }
      setFeedback(res?.message || `Credentials dispatched for ${employee.firstName}`);
      loadEmployees();
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error?.message
          ? err.response.data.error.message
          : 'Failed to dispatch credentials. Please try again.';
      setFeedback(msg);
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
        employees={displayedEmployees}
        meta={meta}
        loading={loading}
        error={error}
        canManage={isAdmin}
        onPageChange={(p) => setPage(p)}
        onRowsPerPageChange={(limit) => {
          setRowsPerPage(limit);
          setPage(1);
        }}
        onView={(idOrCode) => navigate(PATHS.employeeDetails(idOrCode))}
        onEdit={(idOrCode) => navigate(PATHS.editEmployee(idOrCode))}
        onToggleStatus={(emp) => {
          setStatusTarget(emp);
          setStatusReason('');
        }}
        onResendCredentials={handleResendCredentials}
        onRetry={() => loadEmployees()}
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

      {/* Credentials Dialog */}
      {resetCredsDialog && (
        <Dialog
          open={resetCredsDialog.open}
          onClose={() => setResetCredsDialog(null)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 800, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CheckCircleIcon sx={{ color: '#d97706', fontSize: 28 }} />
            Credentials Generated & Dispatched
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {resetCredsDialog.message}
            </Typography>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 2.5,
                bgcolor: '#fffbeb',
                border: '1.5px solid #fde68a',
              }}
            >
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Box sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #fde68a' }}>
                  <Typography variant="caption" sx={{ color: '#78350f', fontWeight: 700, textTransform: 'uppercase' }}>
                    Login ID (Official Email)
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: 'monospace', color: '#1e293b', wordBreak: 'break-all', mt: 0.5 }}>
                    {resetCredsDialog.email}
                  </Typography>
                </Box>

                <Box sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: 2, border: '2px solid #f59e0b' }}>
                  <Typography variant="caption" sx={{ color: '#92400e', fontWeight: 800, textTransform: 'uppercase' }}>
                    Temporary Password
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'monospace', color: '#d97706', letterSpacing: '0.06em', mt: 0.5 }}>
                    {resetCredsDialog.temporaryPassword}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, mt: 2, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<ContentCopyIcon fontSize="small" />}
                  sx={{ bgcolor: '#d97706', '&:hover': { bgcolor: '#b45309' }, fontWeight: 700 }}
                  onClick={() => {
                    navigator.clipboard.writeText(resetCredsDialog.temporaryPassword || '');
                    setFeedback('Temporary password copied to clipboard!');
                  }}
                >
                  Copy Password
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ContentCopyIcon fontSize="small" />}
                  sx={{ color: '#92400e', borderColor: '#d97706', '&:hover': { borderColor: '#b45309', bgcolor: '#fef3c7' }, fontWeight: 600 }}
                  onClick={() => {
                    const full = `Momo HRMS Credentials
${resetCredsDialog.employeeName ? `User: ${resetCredsDialog.employeeName}
` : ''}Login Email: ${resetCredsDialog.email}
Temporary Password: ${resetCredsDialog.temporaryPassword}
Login URL: ${window.location.origin}/login`;
                    navigator.clipboard.writeText(full);
                    setFeedback('Full credentials copied to clipboard!');
                  }}
                >
                  Copy Full Credentials
                </Button>
              </Box>
            </Paper>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setResetCredsDialog(null)} variant="outlined" sx={{ fontWeight: 600 }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}

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
