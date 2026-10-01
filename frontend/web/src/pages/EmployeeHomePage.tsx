import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

// Icons
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import LogoutIcon from '@mui/icons-material/Logout';
import RefreshIcon from '@mui/icons-material/Refresh';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import BadgeIcon from '@mui/icons-material/Badge';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PauseCircleFilledIcon from '@mui/icons-material/PauseCircleFilled';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

import { useAuth } from '../context/AuthContext';
import { COMPANY_NAME } from '../config/env';
import { attendanceApi, type AttendanceSession } from '../api/attendanceApi';
import { employeeApi, type Employee } from '../api/employeeApi';
import { api } from '../api/client';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0 && m === 0) return '< 1m';
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function EmployeeHomePage() {
  const { user, logout } = useAuth();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [todaySession, setTodaySession] = useState<AttendanceSession | null>(null);
  const [history, setHistory] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [faceEnrolled, setFaceEnrolled] = useState<boolean | null>(null);

  // Exception Dialog State
  const [exceptionDialogOpen, setExceptionDialogOpen] = useState(false);
  const [submittingException, setSubmittingException] = useState(false);
  const [exceptionSuccess, setExceptionSuccess] = useState<string | null>(null);
  const [exceptionError, setExceptionError] = useState<string | null>(null);
  const [exceptionForm, setExceptionForm] = useState({
    attendanceDate: new Date().toISOString().split('T')[0],
    type: 'RECHECK_IN',
    reason: '',
    validFrom: `${new Date().toISOString().split('T')[0]}T09:00:00Z`,
    validUntil: `${new Date().toISOString().split('T')[0]}T18:00:00Z`,
  });

  const loadData = useCallback(async () => {
    try {
      // 1. Load employee profile
      if (user?.id) {
        try {
          const emp = await employeeApi.getByUser(user.id);
          setEmployee(emp);
          if (emp?.id) {
            // Check face AI status
            try {
              const faceRes = await api.get<{ is_enrolled: boolean }>(`/face/status/${emp.id}`);
              setFaceEnrolled(faceRes.data.is_enrolled);
            } catch {
              setFaceEnrolled(false);
            }
          }
        } catch {
          // Employee profile might not be linked yet
        }
      }

      // 2. Load today's attendance session
      const today = await attendanceApi.getTodaySession();
      setTodaySession(today);

      // 3. Load attendance history
      const histData = await attendanceApi.getHistory({ limit: 15 });
      setHistory(Array.isArray(histData?.items) ? histData.items : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleOpenExceptionDialog = () => {
    setExceptionSuccess(null);
    setExceptionError(null);
    setExceptionDialogOpen(true);
  };

  const handleSubmitException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee?.id) {
      setExceptionError('Employee profile not identified. Contact HR.');
      return;
    }
    if (!exceptionForm.reason.trim()) {
      setExceptionError('Please specify a valid reason for this request.');
      return;
    }

    setSubmittingException(true);
    setExceptionError(null);
    try {
      await attendanceApi.createException({
        employeeId: employee.id,
        attendanceDate: exceptionForm.attendanceDate,
        type: exceptionForm.type,
        reason: exceptionForm.reason.trim(),
        validFrom: new Date(exceptionForm.validFrom).toISOString(),
        validUntil: new Date(exceptionForm.validUntil).toISOString(),
      });
      setExceptionSuccess('Your attendance regularization request has been submitted for HR review.');
      setTimeout(() => {
        setExceptionDialogOpen(false);
        void loadData();
      }, 1500);
    } catch (err: any) {
      setExceptionError(err?.response?.data?.message || err?.message || 'Failed to submit exception request.');
    } finally {
      setSubmittingException(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FDFCFB', color: '#1F2937', pb: 8 }}>
      {/* Top Header Navigation Bar */}
      <Box
        component="header"
        sx={{
          bgcolor: '#FFFFFF',
          borderBottom: '1px solid #FED7AA',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 12px rgba(255, 107, 53, 0.05)',
        }}
      >
        <Container maxWidth="xl" sx={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Brand */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.8 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 2.5,
                background: 'linear-gradient(135deg, #FF6B35 0%, #FFA043 100%)',
                color: '#FFFFFF',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 900,
                fontSize: 22,
                boxShadow: '0 4px 14px rgba(255, 107, 53, 0.35)',
              }}
            >
              M
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1, color: '#1F2937' }}>
                {COMPANY_NAME}
              </Typography>
              <Typography variant="caption" sx={{ color: '#EA580C', fontWeight: 700 }}>
                Employee Self-Service Portal
              </Typography>
            </Box>
          </Box>

          {/* Right Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={refreshing}
              sx={{
                borderColor: '#FED7AA',
                color: '#EA580C',
                borderRadius: 2,
                fontWeight: 700,
                '&:hover': { bgcolor: '#FFF7ED', borderColor: '#FF6B35' },
              }}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>

            <Chip
              label="EMPLOYEE"
              size="small"
              sx={{
                bgcolor: '#FFF7ED',
                color: '#EA580C',
                fontWeight: 800,
                fontSize: 11,
                border: '1px solid #FED7AA',
              }}
            />

            <Button
              variant="text"
              color="error"
              size="small"
              startIcon={<LogoutIcon />}
              onClick={() => void logout()}
              sx={{ fontWeight: 700 }}
            >
              Sign Out
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Main Body */}
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
            <CircularProgress sx={{ color: '#FF6B35' }} />
          </Box>
        ) : (
          <>
            {/* Welcome & Profile Summary Card */}
            <Card
              sx={{
                p: { xs: 2.5, sm: 3.5 },
                mb: 4,
                borderRadius: 4,
                background: 'linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 100%)',
                border: '1px solid #FED7AA',
                boxShadow: '0 8px 30px rgba(255, 107, 53, 0.08)',
              }}
            >
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: 3.5,
                      background: 'linear-gradient(135deg, #FF6B35 0%, #FFA043 100%)',
                      color: '#FFFFFF',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 26,
                      fontWeight: 900,
                      boxShadow: '0 4px 16px rgba(255, 107, 53, 0.3)',
                    }}
                  >
                    {(user?.fullName || user?.username || 'E')[0].toUpperCase()}
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#1F2937' }}>
                      Welcome back, {employee ? `${employee.firstName} ${employee.lastName}` : user?.fullName || user?.username}!
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 0.8, alignItems: 'center' }}>
                      {employee?.employeeCode && (
                        <Chip
                          icon={<BadgeIcon sx={{ fontSize: '16px !important', color: '#EA580C !important' }} />}
                          label={`ID: ${employee.employeeCode}`}
                          size="small"
                          sx={{ bgcolor: '#FFFFFF', border: '1px solid #FED7AA', color: '#1F2937', fontWeight: 700 }}
                        />
                      )}
                      {employee?.department?.name && (
                        <Chip
                          label={employee.department.name}
                          size="small"
                          sx={{ bgcolor: '#FFFFFF', border: '1px solid #FED7AA', color: '#1F2937', fontWeight: 600 }}
                        />
                      )}
                      {employee?.designation?.title && (
                        <Chip
                          label={employee.designation.title}
                          size="small"
                          sx={{ bgcolor: '#FFFFFF', border: '1px solid #FED7AA', color: '#6B7280', fontWeight: 600 }}
                        />
                      )}
                    </Box>
                  </Box>
                </Box>

                <Button
                  variant="contained"
                  startIcon={<AddCircleIcon />}
                  onClick={handleOpenExceptionDialog}
                  sx={{
                    background: 'linear-gradient(135deg, #FF6B35 0%, #FFA043 100%)',
                    borderRadius: 2.5,
                    px: 3,
                    py: 1.2,
                    fontWeight: 800,
                    boxShadow: '0 4px 14px rgba(255, 107, 53, 0.3)',
                    '&:hover': { background: 'linear-gradient(135deg, #E8551E 0%, #FF8A00 100%)' },
                  }}
                >
                  Request Regularization
                </Button>
              </Box>
            </Card>

            {/* Status Metrics Cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 4 }}>
              {/* Card 1: Today's Attendance */}
              <Card sx={{ p: 3, borderRadius: 3.5, border: '1px solid #FED7AA', bgcolor: '#FFFFFF' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Today's Attendance
                  </Typography>
                  <AccessTimeIcon sx={{ color: '#FF6B35' }} />
                </Box>
                {todaySession ? (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                      {todaySession.status === 'WORKING' && (
                        <Chip icon={<CheckCircleIcon sx={{ color: '#10B981 !important' }} />} label="Working / Active" sx={{ bgcolor: '#ECFDF5', color: '#065F46', fontWeight: 800 }} />
                      )}
                      {todaySession.status === 'PAUSED' && (
                        <Chip icon={<PauseCircleFilledIcon sx={{ color: '#F59E0B !important' }} />} label="On Break / Paused" sx={{ bgcolor: '#FFFBEB', color: '#92400E', fontWeight: 800 }} />
                      )}
                      {todaySession.status === 'CHECKED_OUT' && (
                        <Chip icon={<CancelIcon sx={{ color: '#6B7280 !important' }} />} label="Shift Completed" sx={{ bgcolor: '#F3F4F6', color: '#374151', fontWeight: 800 }} />
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ color: '#4B5563', mb: 0.5 }}>
                      Check-in: <strong>{formatTime(todaySession.checkInAt)}</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#4B5563' }}>
                      Working Duration: <strong>{formatDuration(todaySession.totalWorkingSeconds)}</strong>
                    </Typography>
                  </>
                ) : (
                  <Box sx={{ py: 1 }}>
                    <Chip icon={<HourglassEmptyIcon sx={{ color: '#F59E0B !important' }} />} label="Not Clocked In Yet" sx={{ bgcolor: '#FFFBEB', color: '#92400E', fontWeight: 800, mb: 1.5 }} />
                    <Typography variant="body2" sx={{ color: '#6B7280', fontSize: 13 }}>
                      Please clock in on the mobile app upon arriving at your workplace.
                    </Typography>
                  </Box>
                )}
              </Card>

              {/* Card 2: Assigned Workplace / Geofence */}
              <Card sx={{ p: 3, borderRadius: 3.5, border: '1px solid #FED7AA', bgcolor: '#FFFFFF' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Assigned Workplace
                  </Typography>
                  <LocationOnIcon sx={{ color: '#FF6B35' }} />
                </Box>
                {employee?.assignments && employee.assignments.length > 0 ? (
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#1F2937', mb: 0.5 }}>
                      Primary Office
                    </Typography>
                    <Chip label="GPS Geofenced" size="small" sx={{ bgcolor: '#FFF7ED', color: '#EA580C', fontWeight: 700, mb: 1 }} />
                    <Typography variant="body2" sx={{ color: '#6B7280', fontSize: 13 }}>
                      Automated polygon containment active. Punching is unlocked within office perimeter.
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="body2" sx={{ color: '#6B7280', mb: 1 }}>
                      No active office assignment recorded.
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#EA580C', fontWeight: 600 }}>
                      Contact HR to allocate your workplace office.
                    </Typography>
                  </Box>
                )}
              </Card>

              {/* Card 3: Biometric Face Security */}
              <Card sx={{ p: 3, borderRadius: 3.5, border: '1px solid #FED7AA', bgcolor: '#FFFFFF' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Face Biometrics
                  </Typography>
                  <VerifiedUserIcon sx={{ color: '#FF6B35' }} />
                </Box>
                <Box>
                  {faceEnrolled ? (
                    <>
                      <Chip icon={<CheckCircleIcon sx={{ color: '#10B981 !important' }} />} label="Biometrics Enrolled" sx={{ bgcolor: '#ECFDF5', color: '#065F46', fontWeight: 800, mb: 1.5 }} />
                      <Typography variant="body2" sx={{ color: '#4B5563', fontSize: 13 }}>
                        Encrypted with AES-256-GCM. Active liveness challenge response enabled.
                      </Typography>
                    </>
                  ) : (
                    <>
                      <Chip icon={<HourglassEmptyIcon sx={{ color: '#F59E0B !important' }} />} label="Registration Pending" sx={{ bgcolor: '#FFFBEB', color: '#92400E', fontWeight: 800, mb: 1.5 }} />
                      <Typography variant="body2" sx={{ color: '#6B7280', fontSize: 13 }}>
                        Please complete 1-time facial registration on your Momo Mobile App before checking in.
                      </Typography>
                    </>
                  )}
                </Box>
              </Card>
            </Box>

            {/* Mobile App Security Notice Banner */}
            <Card
              sx={{
                p: 3,
                mb: 4,
                borderRadius: 3.5,
                bgcolor: '#FFF7ED',
                border: '1px solid #FED7AA',
                display: 'flex',
                alignItems: 'center',
                gap: 2.5,
              }}
            >
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 3,
                  bgcolor: '#FFEDD5',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <PhoneAndroidIcon sx={{ fontSize: 30, color: '#EA580C' }} />
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#9A3412', mb: 0.3 }}>
                  How Attendance Punching Works
                </Typography>
                <Typography variant="body2" sx={{ color: '#7C2D12', lineHeight: 1.5, fontSize: 13.5 }}>
                  To guarantee enterprise integrity against buddy-punching and GPS spoofing, <strong>check-in and check-out punches are conducted on the Momo Mobile App</strong>. The mobile app leverages device hardware GPS for multi-point polygon containment and the front camera for AI active challenge liveness detection.
                </Typography>
              </Box>
            </Card>

            {/* Attendance History Section */}
            <Card sx={{ borderRadius: 4, border: '1px solid #FED7AA', bgcolor: '#FFFFFF', overflow: 'hidden' }}>
              <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #FED7AA' }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#1F2937' }}>
                    Recent Attendance Logs
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6B7280' }}>
                    Your recorded sessions, verified punch timestamps, and total working hours
                  </Typography>
                </Box>
                <Chip label={`${history.length} Sessions Recorded`} size="small" sx={{ bgcolor: '#FFF7ED', color: '#EA580C', fontWeight: 700 }} />
              </Box>

              <TableContainer component={Paper} elevation={0}>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead sx={{ bgcolor: '#FFFBF7' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, color: '#4B5563', fontSize: 12 }}>DATE</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#4B5563', fontSize: 12 }}>CHECK IN</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#4B5563', fontSize: 12 }}>CHECK OUT</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#4B5563', fontSize: 12 }}>DURATION</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#4B5563', fontSize: 12 }}>PUNCH STATUS</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#4B5563', fontSize: 12 }}>SESSION STATUS</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ textAlign: 'center', py: 6, color: '#9CA3AF' }}>
                          No past attendance records found. Your punch logs will display here automatically.
                        </TableCell>
                      </TableRow>
                    ) : (
                      history.map((s) => (
                        <TableRow key={s.id} sx={{ '&:hover': { bgcolor: '#FFFDF9' } }}>
                          <TableCell sx={{ fontWeight: 700, color: '#1F2937' }}>
                            {formatDate(s.sessionDate || s.checkInAt)}
                          </TableCell>
                          <TableCell sx={{ color: '#4B5563', fontWeight: 600 }}>
                            {formatTime(s.checkInAt)}
                          </TableCell>
                          <TableCell sx={{ color: '#4B5563', fontWeight: 600 }}>
                            {formatTime(s.checkOutAt)}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: '#EA580C' }}>
                            {formatDuration(s.totalWorkingSeconds)}
                          </TableCell>
                          <TableCell>
                            {s.checkInStatus === 'ON_TIME' && (
                              <Chip label="On Time" size="small" sx={{ bgcolor: '#ECFDF5', color: '#065F46', fontWeight: 700, fontSize: 11 }} />
                            )}
                            {s.checkInStatus === 'LATE' && (
                              <Chip label="Late" size="small" sx={{ bgcolor: '#FEF2F2', color: '#991B1B', fontWeight: 700, fontSize: 11 }} />
                            )}
                            {s.checkInStatus === 'EXCEPTION' && (
                              <Chip label="Exception" size="small" sx={{ bgcolor: '#FFFBEB', color: '#92400E', fontWeight: 700, fontSize: 11 }} />
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={s.status}
                              size="small"
                              sx={{
                                fontWeight: 800,
                                fontSize: 11,
                                bgcolor: s.status === 'WORKING' ? '#ECFDF5' : s.status === 'PAUSED' ? '#FFFBEB' : '#F3F4F6',
                                color: s.status === 'WORKING' ? '#065F46' : s.status === 'PAUSED' ? '#92400E' : '#374151',
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </>
        )}
      </Container>

      {/* Attendance Regularization / Exception Modal Dialog */}
      <Dialog
        open={exceptionDialogOpen}
        onClose={() => !submittingException && setExceptionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3.5,
              p: 1,
              bgcolor: '#FFFFFF',
              boxShadow: '0 24px 64px rgba(255, 107, 53, 0.15)',
              border: '1px solid #FED7AA',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#1F2937', pb: 1 }}>
          Request Attendance Regularization
        </DialogTitle>
        <form onSubmit={handleSubmitException}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <Typography variant="body2" sx={{ color: '#6B7280' }}>
              Submit an attendance exception or missing-punch regularization request for HR verification.
            </Typography>

            {exceptionSuccess && <Alert severity="success">{exceptionSuccess}</Alert>}
            {exceptionError && <Alert severity="error">{exceptionError}</Alert>}

            <TextField
              label="Attendance Date"
              type="date"
              value={exceptionForm.attendanceDate}
              onChange={(e) => setExceptionForm({ ...exceptionForm, attendanceDate: e.target.value })}
              required
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <TextField
              select
              label="Exception Category"
              value={exceptionForm.type}
              onChange={(e) => setExceptionForm({ ...exceptionForm, type: e.target.value })}
              fullWidth
            >
              <MenuItem value="RECHECK_IN">Re-Check-In (Forgot to punch in / out)</MenuItem>
              <MenuItem value="EXTRA_GRACE">Late Arrival Grace Extension</MenuItem>
              <MenuItem value="WORKING_TIME_ADJUSTMENT">Working Time Adjustment / Client Site</MenuItem>
              <MenuItem value="OFFICE_TRANSFER">Temporary Branch / Office Transfer</MenuItem>
            </TextField>

            <TextField
              label="Reason for Exception"
              multiline
              rows={3}
              placeholder="Explain why this regularization is needed (e.g. client visit, connectivity issue, illness)..."
              value={exceptionForm.reason}
              onChange={(e) => setExceptionForm({ ...exceptionForm, reason: e.target.value })}
              required
              fullWidth
            />
          </DialogContent>

          <DialogActions sx={{ p: 2.5, pt: 1 }}>
            <Button
              onClick={() => setExceptionDialogOpen(false)}
              disabled={submittingException}
              sx={{ color: '#6B7280', fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submittingException}
              sx={{
                background: 'linear-gradient(135deg, #FF6B35 0%, #FFA043 100%)',
                color: '#FFFFFF',
                fontWeight: 800,
                borderRadius: 2,
                px: 3,
                boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
                '&:hover': { background: 'linear-gradient(135deg, #E8551E 0%, #FF8A00 100%)' },
              }}
            >
              {submittingException ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
