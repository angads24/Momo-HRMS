import { useState, useEffect } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import type { AppNotification } from '../types/notification';
import { NotificationTypeBadge } from './NotificationTypeBadge';
import {
  approveAttendanceException,
  fetchAttendanceExceptionById,
} from '../../attendance/services/attendanceService';
import { fetchEmployeeByUserId } from '../../../services/employeeService';
import { useAuth } from '../../../context/AuthContext';

const isUuid = (val?: string | null): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim()));

const resolveApproverName = (
  nameCandidate?: string | null,
  emailCandidate?: string | null,
  userIdCandidate?: string | null,
  hrEmailFallback?: string | null,
  currentUser?: { id?: string; fullName?: string | null; username?: string | null; email?: string | null } | null
): string => {
  if (nameCandidate && !isUuid(nameCandidate)) return nameCandidate.trim();
  if (userIdCandidate && currentUser?.id === userIdCandidate) {
    return currentUser.fullName || currentUser.username || currentUser.email || 'HR Administrator';
  }
  if (emailCandidate) return emailCandidate.trim();
  if (hrEmailFallback) return hrEmailFallback.trim();
  return 'HR Administrator';
};

interface Props {
  open: boolean;
  notification: AppNotification | null;
  onClose: () => void;
  onMarkRead: (notification: AppNotification) => void;
  onActionComplete?: () => void;
}

export function NotificationPreviewDialog({
  open,
  notification,
  onClose,
  onMarkRead,
  onActionComplete,
}: Props) {
  const { user } = useAuth();
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [exceptionStatus, setExceptionStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [decisionBy, setDecisionBy] = useState<string | null>(null);
  const [decisionAt, setDecisionAt] = useState<string | null>(null);
  const [decisionComment, setDecisionComment] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const meta = (notification?.metadata || {}) as Record<string, any>;
    const rawStatus = meta.status;
    const exceptionId = String(meta.exceptionId || '');

    setExceptionStatus(rawStatus === 'APPROVED' || rawStatus === 'REJECTED' ? rawStatus : 'PENDING');
    const initialApprover = resolveApproverName(
      meta.approvedByName,
      meta.approvedByEmail,
      meta.approvedByUserId,
      meta.hrEmail,
      user,
    );
    setDecisionBy(initialApprover);
    setDecisionAt(meta.approvedAt || null);
    setDecisionComment(meta.comment || null);
    setActionError(null);
    setActionSuccess(null);
    setActionLoading(false);

    if (exceptionId) {
      fetchAttendanceExceptionById(exceptionId)
        .then((latestEx) => {
          if (!active || !latestEx) return;
          const exMeta = (latestEx.metadata as Record<string, any>) || {};
          setExceptionStatus(latestEx.status);
          if (latestEx.status === 'APPROVED' || latestEx.status === 'REJECTED') {
            const approver = resolveApproverName(
              exMeta.approvedByName,
              exMeta.approvedByEmail,
              latestEx.approvedByUserId || exMeta.approvedByUserId,
              exMeta.hrEmail || meta.hrEmail,
              user,
            );
            const atTime = latestEx.approvedAt || exMeta.approvedAt;
            setDecisionBy(approver);
            setDecisionAt(atTime ? String(atTime) : null);
            setDecisionComment(exMeta.comment || null);

            // If we have an approver UUID not yet resolved to a human name, try employee lookup
            const approverUserId = latestEx.approvedByUserId || exMeta.approvedByUserId;
            if (
              approverUserId &&
              isUuid(approverUserId) &&
              approverUserId !== user?.id &&
              (!exMeta.approvedByName || isUuid(exMeta.approvedByName))
            ) {
              fetchEmployeeByUserId(approverUserId)
                .then((emp) => {
                  if (!active || !emp) return;
                  const resolvedName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email;
                  if (resolvedName) {
                    setDecisionBy(resolvedName);
                  }
                })
                .catch(() => {});
            }
          }
        })
        .catch(() => {
          // fallback to notification metadata
        });
    }

    return () => {
      active = false;
    };
  }, [notification, user]);

  if (!notification) return null;

  const metadata = (notification.metadata || {}) as Record<string, any>;
  const isSpecialHoursRequest =
    notification.type === ('SPECIAL_WORKING_HOURS_REQUEST' as any) ||
    Boolean(metadata.exceptionId) ||
    metadata.additionalHours !== undefined ||
    metadata.requestedHours !== undefined;

  const exceptionId = String(metadata.exceptionId || '');
  const employeeName = String(metadata.employeeName || 'Employee');
  const employeeEmail = String(metadata.employeeEmail || '');
  const employeeId = String(metadata.employeeId || '');
  const dateStr = String(metadata.attendanceDate || metadata.dateStr || '');
  const additionalHours =
    Number(metadata.additionalHours) ||
    Number(metadata.requestedHours) ||
    (Number(metadata.additionalMinutes) ? Number(metadata.additionalMinutes) / 60 : 0);
  const reason = String(metadata.reason || notification.body || '');
  const hrEmail = String(metadata.hrEmail || '');

  const handleAction = async (status: 'APPROVED' | 'REJECTED') => {
    if (!exceptionId) {
      setActionError('Exception request ID not found in notification metadata.');
      return;
    }

    try {
      setActionLoading(true);
      setActionError(null);
      const approverName = user?.fullName || user?.username || user?.email || 'HR Administrator';
      const approverEmail = user?.email || undefined;
      const nowIso = new Date().toISOString();

      await approveAttendanceException(exceptionId, {
        status,
        comment: `Handled via Web Notification Center by ${approverName} on ${new Date().toLocaleString()}`,
        approverName,
        approverEmail,
        employeeId,
        attendanceDate: dateStr,
        additionalHours,
        reason,
        metadata: {
          ...metadata,
          employeeName,
          employeeEmail,
          hrEmail,
        },
      });

      setExceptionStatus(status);
      setDecisionBy(approverName);
      setDecisionAt(nowIso);
      setActionSuccess(
        status === 'APPROVED'
          ? `Special working hours (+${additionalHours}h) approved and credited to ${employeeName} for ${dateStr}.`
          : `Special working hours request rejected for ${employeeName}.`,
      );

      // Auto-mark notification as read
      if (!notification.isRead) {
        onMarkRead(notification);
      }

      if (onActionComplete) {
        onActionComplete();
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        `Failed to ${status.toLowerCase()} request. Please try again.`;
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <NotificationTypeBadge type={notification.type} />
          <Typography variant="caption" color="text.secondary">
            {new Date(notification.createdAt).toLocaleString()}
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
          {notification.title}
        </Typography>

        {isSpecialHoursRequest ? (
          <Box sx={{ mb: 2 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'primary.light',
                bgcolor: 'primary.50',
                background: 'linear-gradient(135deg, rgba(238, 242, 255, 0.6) 0%, rgba(224, 231, 255, 0.4) 100%)',
              }}
            >
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.dark' }}>
                  SPECIAL WORKING-HOURS APPLICATION
                </Typography>
                <Chip
                  size="small"
                  label={exceptionStatus}
                  color={
                    exceptionStatus === 'APPROVED'
                      ? 'success'
                      : exceptionStatus === 'REJECTED'
                      ? 'error'
                      : 'warning'
                  }
                  sx={{ fontWeight: 700, fontSize: 11 }}
                />
              </Stack>

              <Stack spacing={1} sx={{ fontSize: 13 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2">
                    <strong>Employee:</strong> {employeeName} ({employeeId || 'ID Pending'})
                  </Typography>
                </Stack>

                {employeeEmail ? (
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      <strong>Employee Email:</strong> {employeeEmail}
                    </Typography>
                  </Stack>
                ) : null}

                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2">
                    <strong>Applicable Date:</strong> {dateStr || 'Today'}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <ScheduleIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                  <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 700 }}>
                    <strong>Requested Additional Hours:</strong> +{additionalHours}h ({Math.round(additionalHours * 60)} mins)
                  </Typography>
                </Stack>

                {hrEmail ? (
                  <Typography variant="caption" color="text.secondary">
                    Sent to HR: {hrEmail}
                  </Typography>
                ) : null}

                <Divider sx={{ my: 1 }} />

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                    Reason / Genuine Situation Message:
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      bgcolor: 'background.paper',
                      borderRadius: 1.5,
                      fontStyle: 'italic',
                      color: 'text.primary',
                    }}
                  >
                    "{reason}"
                  </Paper>
                </Box>
              </Stack>
            </Paper>

            {actionError ? (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
                {actionError}
              </Alert>
            ) : null}

            {actionSuccess ? (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setActionSuccess(null)}>
                {actionSuccess}
              </Alert>
            ) : null}

            {exceptionStatus === 'PENDING' ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'background.default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 1.5,
                }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    HR Decision Action
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Approving will immediately credit +{additionalHours}h to this employee's attendance.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="contained"
                    color="success"
                    size="medium"
                    startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                    disabled={actionLoading}
                    onClick={() => handleAction('APPROVED')}
                    sx={{ fontWeight: 700, textTransform: 'none', px: 2.5 }}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="medium"
                    startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <CancelIcon />}
                    disabled={actionLoading}
                    onClick={() => handleAction('REJECTED')}
                    sx={{ fontWeight: 700, textTransform: 'none' }}
                  >
                    Reject
                  </Button>
                </Stack>
              </Paper>
            ) : (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: exceptionStatus === 'APPROVED' ? '#f0fdf4' : '#fef2f2',
                  borderColor: exceptionStatus === 'APPROVED' ? '#bbf7d0' : '#fecaca',
                }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75 }}>
                  <CheckCircleIcon sx={{ fontSize: 20, color: exceptionStatus === 'APPROVED' ? '#16a34a' : '#dc2626' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: exceptionStatus === 'APPROVED' ? '#15803d' : '#b91c1c' }}>
                    {exceptionStatus === 'APPROVED' ? 'Request Approved' : 'Request Rejected'}
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ color: '#1e293b', fontSize: '0.85rem' }}>
                  <strong>Decided by:</strong>{' '}
                  {decisionBy && !isUuid(decisionBy)
                    ? decisionBy
                    : user?.fullName || hrEmail || 'HR Administrator'}
                </Typography>
                {decisionAt ? (
                  <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.85rem', mt: 0.25 }}>
                    <strong>Date & Time:</strong> {new Date(decisionAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </Typography>
                ) : null}
                {decisionComment ? (
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                    Note: {decisionComment}
                  </Typography>
                ) : null}
              </Paper>
            )}
          </Box>
        ) : (
          <>
            <Typography
              variant="body1"
              sx={{
                whiteSpace: 'pre-line',
                mb: 3,
                fontSize: '0.98rem',
                lineHeight: 1.6,
                color: '#1e293b',
              }}
            >
              {notification.body}
            </Typography>

            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: '#f8fafc',
                borderColor: '#e2e8f0',
              }}
            >
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Typography
                    variant="caption"
                    sx={{
                      minWidth: 50,
                      fontWeight: 700,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontSize: '0.72rem',
                    }}
                  >
                    From:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                    {notification.from || (notification.metadata as any)?.senderName || 'System Administrator'}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Typography
                    variant="caption"
                    sx={{
                      minWidth: 50,
                      fontWeight: 700,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontSize: '0.72rem',
                    }}
                  >
                    To:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                    {notification.to ||
                      notification.recipientName ||
                      (notification.recipientType === 'BROADCAST'
                        ? 'All Staff'
                        : notification.recipientType === 'HR'
                        ? 'Human Resources'
                        : notification.recipientType === 'ADMIN'
                        ? 'Administrators'
                        : (notification.metadata as any)?.name || notification.recipientId)}
                  </Typography>
                  {Boolean((notification.metadata as any)?.department) && (
                    <Chip
                      label={String((notification.metadata as any).department)}
                      size="small"
                      sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, bgcolor: '#e2e8f0', color: '#334155' }}
                    />
                  )}
                  {Boolean((notification.metadata as any)?.role) && (
                    <Chip
                      label={String((notification.metadata as any).role)}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}
                    />
                  )}
                </Stack>

                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Typography
                    variant="caption"
                    sx={{
                      minWidth: 50,
                      fontWeight: 700,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontSize: '0.72rem',
                    }}
                  >
                    Date:
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.84rem' }}>
                    {new Date(notification.createdAt).toLocaleString([], {
                      dateStyle: 'full',
                      timeStyle: 'short',
                    })}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0 }}>
        {!notification.isRead && (
          <Button
            variant="outlined"
            color="primary"
            startIcon={<CheckIcon />}
            onClick={() => {
              onMarkRead(notification);
              onClose();
            }}
          >
            Mark as Read
          </Button>
        )}
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
