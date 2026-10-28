import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import RefreshIcon from '@mui/icons-material/Refresh';
import ComputerIcon from '@mui/icons-material/Computer';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import FolderSharedOutlinedIcon from '@mui/icons-material/FolderSharedOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LinkIcon from '@mui/icons-material/Link';
import { DashboardLayout } from '../../../components/DashboardLayout';
import { LoadingIndicator } from '../../../components/LoadingIndicator';
import { PATHS } from '../../../routes/paths';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../api/client';
import { ATTENDANCE_API_URL } from '../../../config/env';
import {
  changeEmployeeStatus,
  fetchEmployeeProfile,
  resendCredentials,
  updateEmployeeRole,
} from '../../../services/employeeService';
import { updateAuthUserRoles } from '../../../api/authApi';
import type { EmployeeProfileResponse } from '../../../types/employee';
import { EmployeeStatusBadge } from '../components/EmployeeStatusBadge';
import { AccountStatusBadge } from '../components/AccountStatusBadge';

function calculateAge(dobString?: string | null): number | null {
  if (!dobString) return null;
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '00h 00m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
}

export default function EmployeeDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.appRole === 'ADMIN';
  const isHr = user?.appRole === 'HR';
  const isSuperAdmin = Boolean(
    user?.roles?.includes('SUPER_ADMIN') ||
    user?.email?.toLowerCase().includes('admin')
  );
  const canManageRoles = Boolean(
    isAdmin ||
    isSuperAdmin ||
    user?.roles?.some((r) => r.includes('ADMIN') || r.includes('SUPER'))
  );

  const [data, setData] = useState<EmployeeProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status toggle modal
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusReason, setStatusReason] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Role change modal
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedNewRole, setSelectedNewRole] = useState<'EMPLOYEE' | 'HR_ADMIN' | 'SUPER_ADMIN'>('EMPLOYEE');
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  const [resetCredsDialog, setResetCredsDialog] = useState<{
    open: boolean;
    employeeName?: string;
    email: string;
    temporaryPassword?: string;
    message: string;
  } | null>(null);

  // Attendance Information
  const [todayAttendance, setTodayAttendance] = useState<{
    sessions?: any[];
    totalWorkingSecondsToday?: number;
    hasActiveSession?: boolean;
    attendanceDate?: string;
  } | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyRowsPerPage, setHistoryRowsPerPage] = useState(10);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const empCodeRef = useRef<string | undefined>(undefined);

  // Employee Documents & Drive Link (Local client storage, reflected here; edited via Edit Profile)
  const [driveLink, setDriveLink] = useState<string>('');

  useEffect(() => {
    if (data?.employee) {
      const stored =
        (data.employee.id && localStorage.getItem(`hrms_emp_doc_drive_${data.employee.id}`)) ||
        (data.employee.employeeCode && localStorage.getItem(`hrms_emp_doc_drive_${data.employee.employeeCode}`)) ||
        (id ? localStorage.getItem(`hrms_emp_doc_drive_${id}`) : null) ||
        '';
      setDriveLink(stored);
    }
  }, [data?.employee, id]);

  const loadAttendance = useCallback(async (codeOverride?: string) => {
    if (!id) return;
    setLoadingAttendance(true);
    try {
      const targetCode = codeOverride || empCodeRef.current || id;

      const [todayRes, historyRes] = await Promise.all([
        api.get(`${ATTENDANCE_API_URL}/today`).catch(() => null),
        api.get(`${ATTENDANCE_API_URL}/history`).catch(() => null),
      ]);
      const todayData = todayRes?.data?.data || todayRes?.data;
      const historyData = historyRes?.data?.data || historyRes?.data;
      const histItems = historyData?.items || (Array.isArray(historyData) ? historyData : []);

      if (todayData) {
        const rawSessions = Array.isArray(todayData.sessions)
          ? todayData.sessions
          : Array.isArray(todayData)
          ? todayData
          : [];
        const filteredSessions = rawSessions.filter(
          (s: any) => s.employeeId === targetCode || s.employeeCode === targetCode,
        );
        const totalSecs = filteredSessions.reduce(
          (acc: number, s: any) => acc + (Number(s.totalWorkingSeconds) || 0),
          0,
        );
        const hasActive = filteredSessions.some((s: any) => s.status === 'CHECKED_IN');
        setTodayAttendance({
          attendanceDate: todayData.attendanceDate || new Date().toISOString().split('T')[0],
          sessions: filteredSessions,
          totalWorkingSecondsToday: totalSecs,
          hasActiveSession: hasActive,
        });
      }
      if (histItems) {
        const filteredHistory = histItems.filter(
          (s: any) => s.employeeId === targetCode || s.employeeCode === targetCode,
        );
        setAttendanceHistory(filteredHistory);
      }
    } catch {
      // Attendance query failure should not break profile view
    } finally {
      setLoadingAttendance(false);
    }
  }, [id]);

  const loadProfile = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const profile = await fetchEmployeeProfile(id);
      setData(profile);
      empCodeRef.current = profile?.employee?.employeeCode;
      const code = profile?.employee?.employeeCode || id;
      void loadAttendance(code);
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error?.message
          ? err.response.data.error.message
          : 'Failed to load employee details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id, loadAttendance]);

  const handleResend = async () => {
    if (!id) return;
    setResending(true);
    try {
      const res = await resendCredentials(id);
      if (res?.temporaryPassword) {
        setResetCredsDialog({
          open: true,
          employeeName: data?.employee ? `${data.employee.firstName} ${data.employee.lastName}` : undefined,
          email: data?.employee?.email || res.deliveredTo || '',
          temporaryPassword: res.temporaryPassword,
          message: res.message || `Credentials dispatched to ${res.deliveredTo || data?.employee?.email}`,
        });
      }
      setFeedback(res?.message || 'Credentials resent successfully.');
      loadProfile();
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error?.message
          ? err.response.data.error.message
          : 'Failed to dispatch credentials.';
      setFeedback(msg);
    } finally {
      setResending(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleStatusToggle = async () => {
    if (!data) return;
    setStatusSubmitting(true);
    const isCurrentlyActive = data.employee.status === 'ACTIVE';
    const nextStatus = isCurrentlyActive ? 'TERMINATED' : 'ACTIVE';
    try {
      await changeEmployeeStatus(data.employee.id, {
        status: nextStatus,
        reason: statusReason || undefined,
      });
      setStatusDialogOpen(false);
      setStatusReason('');
      setFeedback(`Employee successfully ${nextStatus === 'ACTIVE' ? 'activated' : 'deactivated'}.`);
      loadProfile();
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

  const handleRoleChange = async () => {
    if (!data) return;
    setRoleSubmitting(true);
    try {
      await updateEmployeeRole(data.employee.id, selectedNewRole);
      if (data.employee.userId) {
        await updateAuthUserRoles(data.employee.userId, [selectedNewRole]).catch(() => {});
      }
      setRoleDialogOpen(false);
      setFeedback(`Role successfully changed to ${selectedNewRole}.`);
      loadProfile();
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error?.message
          ? err.response.data.error.message
          : 'Failed to update employee role.';
      setError(msg);
    } finally {
      setRoleSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Employee Details" subtitle="Loading profile...">
        <LoadingIndicator message="Retrieving employee profile..." />
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout title="Employee Details" subtitle="Error loading profile">
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error || 'Employee not found.'}
          </Alert>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(PATHS.employees)}
            >
              Back to Employee List
            </Button>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={loadProfile}
            >
              Retry
            </Button>
          </Box>
        </Paper>
      </DashboardLayout>
    );
  }

  const { employee } = data;
  const initials = `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`.toUpperCase();
  const isActive = employee.status === 'ACTIVE';
  const age = calculateAge(employee.dateOfBirth);

  const isProfileComplete = Boolean(
    employee.dateOfBirth &&
    employee.gender &&
    employee.phone &&
    employee.address &&
    employee.personalEmail
  );

  // Compute today's attendance display
  const todaySessions = todayAttendance?.sessions || [];
  const latestSession = todaySessions[todaySessions.length - 1];
  const hasCheckedInToday = todaySessions.length > 0;
  const isWorkingNow = latestSession?.status === 'WORKING';
  const isPausedNow = latestSession?.status === 'PAUSED';
  const isCheckedOutToday = latestSession?.status === 'CHECKED_OUT' || latestSession?.status === 'AUTO_CHECKED_OUT';
  const todayStatusLabel = isWorkingNow
    ? 'Working (Inside Office)'
    : isPausedNow
    ? 'Paused (Outside Office)'
    : isCheckedOutToday
    ? 'Checked Out'
    : 'Not Checked In';
  const todayStatusColor = isWorkingNow ? 'success' : isPausedNow ? 'warning' : isCheckedOutToday ? 'info' : 'default';

  return (
    <DashboardLayout
      title={`${employee.firstName} ${employee.lastName}`}
      subtitle={`Employee Code: ${employee.employeeCode}`}
    >
      {/* Navigation & Header Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          color="inherit"
          onClick={() => navigate(PATHS.employees)}
        >
          Back to Employee List
        </Button>
        {(isAdmin || isHr) && (
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {isAdmin && (
              <>
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<VpnKeyOutlinedIcon />}
                  disabled={resending}
                  onClick={handleResend}
                >
                  {resending ? 'Sending...' : 'Resend Credentials'}
                </Button>
                <Button
                  variant="outlined"
                  color={isActive ? 'error' : 'success'}
                  startIcon={isActive ? <BlockIcon /> : <CheckCircleIcon />}
                  onClick={() => setStatusDialogOpen(true)}
                >
                  {isActive ? 'Deactivate' : 'Activate'}
                </Button>
                {canManageRoles && (
                  <Button
                    variant="outlined"
                    color="info"
                    startIcon={<SupervisorAccountIcon />}
                    onClick={() => {
                      const currentRoleName = employee.role?.name?.toUpperCase() || (employee.isHr ? 'HR_ADMIN' : 'EMPLOYEE');
                      setSelectedNewRole(currentRoleName.includes('SUPER') ? 'SUPER_ADMIN' : currentRoleName.includes('HR') ? 'HR_ADMIN' : 'EMPLOYEE');
                      setRoleDialogOpen(true);
                    }}
                  >
                    Change Role
                  </Button>
                )}
              </>
            )}
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => navigate(PATHS.editEmployee(employee.id))}
            >
              Edit Profile
            </Button>
          </Box>
        )}
      </Box>

      {/* Profile Overview Card */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          <Avatar
            src={employee.profilePhotoUrl ?? undefined}
            sx={{ width: 72, height: 72, bgcolor: 'primary.main', fontSize: '1.75rem', fontWeight: 700 }}
          >
            {initials}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5, flexWrap: 'wrap' }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {employee.firstName} {employee.lastName}
              </Typography>
              <EmployeeStatusBadge status={employee.status} size="medium" />
              {employee.bloodGroup && (
                <Chip
                  label={` Blood Group: ${employee.bloodGroup}`}
                  size="small"
                  color="error"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              )}
              <Chip
                label={isProfileComplete ? 'Profile Complete' : 'Profile Incomplete'}
                color={isProfileComplete ? 'success' : 'warning'}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
              <AccountStatusBadge
                hasAccount={Boolean(employee.userId || employee.hasAccount)}
                credentialsSentAt={employee.credentialsSentAt}
                size="medium"
              />
            </Box>
            <Typography variant="body1" color="text.secondary">
              {employee.jobTitle} • {employee.department?.name}
            </Typography>
            <Typography component="div" variant="body2" color="text.secondary">
              Organization Role: <strong>{employee.role?.name}</strong>
              {(employee.assignedOffices || []).length > 0 ? (
                <>
                  {' '}• Assigned Offices:
                  <Box component="span" sx={{ display: 'inline-flex', flexWrap: 'wrap', gap: 0.5, ml: 1, verticalAlign: 'middle' }}>
                    {employee.assignedOffices!.map((o) => (
                      <Chip
                        key={o.id}
                        label={`📍 ${o.name} (${o.code})${o.isPrimary ? ' [Primary]' : ''}`}
                        size="small"
                        color={o.isPrimary ? 'primary' : 'default'}
                        variant={o.isPrimary ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 600, fontSize: '0.75rem', height: 22 }}
                      />
                    ))}
                  </Box>
                </>
              ) : employee.officeLocationName ? (
                <> • Assigned Office: <strong style={{ color: '#1976d2' }}>📍 {employee.officeLocationName}</strong></>
              ) : null}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* HR Unified Account Information */}
      {Boolean(['HR_ADMIN', 'SUPER_ADMIN', 'HR'].includes(employee.role?.name?.toUpperCase() || '')) && (
        <Card
          variant="outlined"
          sx={{
            mb: 3,
            borderColor: 'secondary.main',
            borderWidth: 1.5,
            bgcolor: 'rgba(156, 39, 176, 0.03)',
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <SupervisorAccountIcon color="secondary" />
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'secondary.dark' }}>
                HR Staff Member — Unified Company Account
              </Typography>
              <Chip label="Web & Mobile Access" color="secondary" size="small" sx={{ fontWeight: 700 }} />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              This staff member has a single unified account used for administrative web management as well as mobile app attendance:
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <ComputerIcon color="secondary" fontSize="small" />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Official Login Email (ID)
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', color: 'secondary.main' }}>
                {employee.email}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Valid for: Web Management Portal & Mobile Attendance App
              </Typography>
            </Paper>
          </CardContent>
        </Card>
      )}

      {/* Attendance Summary Section */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <AccessTimeIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Attendance & Time Logs
              </Typography>
              {loadingAttendance ? (
                <CircularProgress size={16} />
              ) : (
                <IconButton
                  size="small"
                  onClick={() => loadAttendance(data?.employee?.employeeCode)}
                  title="Refresh Attendance Logs"
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
            <Chip
              label={`Today: ${todayStatusLabel}`}
              color={todayStatusColor as any}
              sx={{ fontWeight: 700 }}
            />
          </Box>
          <Divider sx={{ mb: 2 }} />
 
          {isPausedNow && (
            <Alert
              severity="warning"
              variant="outlined"
              sx={{ mb: 2, alignItems: 'center' }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Attendance Session Currently Paused (Outside Office Boundary)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Employee has exited the assigned office geofence. Working hours are paused.
                  {latestSession?.currentGraceDeadline && (
                    <> Auto-checkout grace deadline: <strong>{new Date(latestSession.currentGraceDeadline).toLocaleTimeString()}</strong>.</>
                  )}
                </Typography>
              </Box>
            </Alert>
          )}

          {/* Today's Metrics */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
              <Typography variant="caption" color="text.secondary">Today's Check-In</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {latestSession?.checkInAt ? new Date(latestSession.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
              <Typography variant="caption" color="text.secondary">Today's Check-Out</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {latestSession?.checkOutAt ? new Date(latestSession.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
              <Typography variant="caption" color="text.secondary">Working Hours Today</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {formatDuration(todayAttendance?.totalWorkingSecondsToday ?? latestSession?.totalWorkingSeconds ?? 0)}
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
              <Typography variant="caption" color="text.secondary">Punctuality</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {latestSession?.checkInStatus?.replace('_', ' ') || (hasCheckedInToday ? 'On Time' : '—')}
              </Typography>
            </Paper>
          </Box>

          {/* Recent Attendance History Table */}
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon fontSize="small" color="action" />
            Recent Attendance Records
          </Typography>
          {attendanceHistory.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No previous attendance records logged for this employee.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Check-In</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Check-Out</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Working Duration</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendanceHistory
                    .slice(historyPage * historyRowsPerPage, historyPage * historyRowsPerPage + historyRowsPerPage)
                    .map((sess) => (
                    <TableRow key={sess.id}>
                      <TableCell>{sess.attendanceDate ? String(sess.attendanceDate).slice(0, 10) : '—'}</TableCell>
                      <TableCell>{sess.checkInAt ? new Date(sess.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</TableCell>
                      <TableCell>{sess.checkOutAt ? new Date(sess.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{formatDuration(sess.totalWorkingSeconds)}</TableCell>
                      <TableCell>
                        <Chip
                          label={
                            sess.status === 'WORKING'
                              ? 'Working'
                              : sess.status === 'PAUSED'
                              ? 'Paused'
                              : sess.status === 'CHECKED_OUT'
                              ? 'Checked Out'
                              : sess.status?.replace('_', ' ')
                          }
                          size="small"
                          color={
                            sess.status === 'WORKING'
                              ? 'success'
                              : sess.status === 'PAUSED'
                              ? 'warning'
                              : 'default'
                          }
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={attendanceHistory.length}
                rowsPerPage={historyRowsPerPage}
                page={historyPage}
                onPageChange={(_e, newPage) => setHistoryPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setHistoryRowsPerPage(parseInt(e.target.value, 10));
                  setHistoryPage(0);
                }}
                sx={{ borderTop: '1px solid', borderColor: 'divider' }}
              />
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
        {/* Card 1: Personal & Account Information */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700 }} gutterBottom>
              Personal & Account Information
            </Typography>
            <Divider sx={{ my: 1.5 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Full Legal Name</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{employee.firstName} {employee.lastName}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Official Login Email (Company)</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>{employee.email}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Personal Email (Credential Delivery)</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{employee.personalEmail || 'Not specified'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Credentials Last Sent</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {employee.credentialsSentAt ? new Date(employee.credentialsSentAt).toLocaleString() : 'Not dispatched yet'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Phone Number</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{employee.phone}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Alternate Contact Number</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {employee.alternatePhone || 'Not specified'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Blood Group</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: employee.bloodGroup ? 'error.main' : 'text.primary' }}>
                  {employee.bloodGroup ? ` ${employee.bloodGroup}` : 'Not specified'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Date of Birth & Calculated Age</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {employee.dateOfBirth
                    ? `${employee.dateOfBirth} (${age !== null ? `${age} years old` : 'Age unavailable'})`
                    : 'Not specified'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Gender</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{employee.gender?.replace('_', ' ') ?? 'Not specified'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Residential Address</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{employee.address ?? 'Not specified'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Permanent Address</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{employee.permanentAddress || employee.address || 'Not specified'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Emergency Contact</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {employee.emergencyContactName
                    ? `${employee.emergencyContactName} (${employee.emergencyContactRelation || 'Emergency'})${employee.emergencyContactPhone ? ` •  ${employee.emergencyContactPhone}` : ''}`
                    : (employee.phone ? `${employee.phone} (Primary Phone)` : employee.personalEmail || 'Not specified')}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Card 2: Employment Details */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700 }} gutterBottom>
              Employment Details
            </Typography>
            <Divider sx={{ my: 1.5 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Employee Code</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{employee.employeeCode}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Department</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {employee.department?.name} ({employee.department?.code})
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Designation / Job Title</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{employee.jobTitle}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Date of Joining</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{employee.dateOfJoining}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Assigned Workplaces (Multi-Location Access)</Typography>
                {(employee.assignedOffices || []).length > 0 ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
                    {employee.assignedOffices!.map((o) => (
                      <Chip
                        key={o.id}
                        label={`📍 ${o.name} (${o.code})${o.isPrimary ? ' • Primary Workplace' : ''}`}
                        size="small"
                        color={o.isPrimary ? 'primary' : 'default'}
                        variant={o.isPrimary ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {employee.officeLocationName || 'Not assigned'}
                  </Typography>
                )}
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Account Created</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {new Date(employee.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
              {employee.deactivatedAt && (
                <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="caption" color="error.main" sx={{ fontWeight: 600 }}>
                    Deactivated on {new Date(employee.deactivatedAt).toLocaleDateString()}
                  </Typography>
                  {employee.deactivationReason && (
                    <Typography variant="body2" color="text.secondary">
                      Reason: {employee.deactivationReason}
                    </Typography>
                  )}
                </Box>
              )}

              <Divider sx={{ my: 1.5 }} />

              {/* Documents & Drive Link Section (Display/reflection only; added/modified via Edit Profile) */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                  <FolderSharedOutlinedIcon color="primary" fontSize="small" />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Documents (Google Drive)
                  </Typography>
                </Box>

                {driveLink ? (
                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: 'rgba(25, 118, 210, 0.04)',
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: 'rgba(25, 118, 210, 0.2)',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <LinkIcon color="primary" fontSize="small" />
                      <Typography
                        variant="body2"
                        component="a"
                        href={driveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          fontWeight: 500,
                          fontFamily: 'monospace',
                          color: 'primary.main',
                          textDecoration: 'underline',
                          wordBreak: 'break-all',
                          fontSize: '0.8rem',
                        }}
                      >
                        {driveLink}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<OpenInNewIcon />}
                        href={driveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem' }}
                      >
                        Open Drive Folder
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ContentCopyIcon />}
                        onClick={() => {
                          navigator.clipboard.writeText(driveLink);
                          setFeedback('Drive link copied to clipboard!');
                        }}
                        sx={{ textTransform: 'none', fontSize: '0.78rem' }}
                      >
                        Copy Link
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', mt: 0.25 }}>
                    Not specified
                  </Typography>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Confirmation Dialog for Status Change */}
      <Dialog
        open={statusDialogOpen}
        onClose={() => !statusSubmitting && setStatusDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {isActive ? 'Deactivate Employee' : 'Activate Employee'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {isActive
              ? `Are you sure you want to deactivate ${employee.firstName} ${employee.lastName}? They will no longer be eligible for attendance tracking or active operations.`
              : `Are you sure you want to reactivate ${employee.firstName} ${employee.lastName}? Their employment status will be restored to ACTIVE.`}
          </DialogContentText>

          {isActive && (
            <TextField
              label="Deactivation Reason (Optional)"
              multiline
              rows={2}
              fullWidth
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="e.g. Resignation, leaves, contract completion..."
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setStatusDialogOpen(false)} color="inherit" disabled={statusSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleStatusToggle}
            color={isActive ? 'error' : 'success'}
            variant="contained"
            disabled={statusSubmitting}
          >
            {statusSubmitting ? 'Updating...' : isActive ? 'Confirm Deactivation' : 'Confirm Activation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Credentials Reset Dialog */}
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

      {/* Change Role Dialog */}
      <Dialog open={roleDialogOpen} onClose={() => !roleSubmitting && setRoleDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Change Access Role</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Update system and organizational access role for <strong>{employee.firstName} {employee.lastName}</strong> ({employee.employeeCode}).
          </DialogContentText>
          <Box sx={{ mt: 1 }}>
            <TextField
              select
              fullWidth
              label="Select New Role"
              value={selectedNewRole}
              onChange={(e) => setSelectedNewRole(e.target.value as any)}
              disabled={roleSubmitting}
            >
              <MenuItem value="EMPLOYEE">
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>EMPLOYEE</Typography>
                  <Typography variant="caption" color="text.secondary">Mobile App Attendance & Profile Only</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="HR_ADMIN">
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>HR_ADMIN</Typography>
                  <Typography variant="caption" color="text.secondary">Web Management Portal + Mobile Attendance</Typography>
                </Box>
              </MenuItem>
              {isSuperAdmin && (
                <MenuItem value="SUPER_ADMIN">
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: 'error.main' }}>SUPER_ADMIN</Typography>
                    <Typography variant="caption" color="text.secondary">Developer / Full System Administration Access</Typography>
                  </Box>
                </MenuItem>
              )}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setRoleDialogOpen(false)} disabled={roleSubmitting} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleRoleChange}
            disabled={roleSubmitting}
          >
            {roleSubmitting ? <CircularProgress size={20} /> : 'Confirm Role Change'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Snackbar */}
      <Snackbar open={Boolean(feedback)} autoHideDuration={4000} onClose={() => setFeedback(null)}>
        <Alert severity="success" onClose={() => setFeedback(null)} variant="filled">
          {feedback}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
