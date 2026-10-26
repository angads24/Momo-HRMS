import { useState, useEffect } from 'react';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import SendIcon from '@mui/icons-material/Send';
import CampaignIcon from '@mui/icons-material/Campaign';
import PersonIcon from '@mui/icons-material/Person';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { NOTIFICATION_TYPES, type NotificationType } from '../types/notification';
import { sendNotification } from '../services/notificationService';
import { fetchEmployees } from '../../../services/employeeService';
import { api } from '../../../api/client';
import { useAuth } from '../../../context/AuthContext';

export type TargetDeliveryMode = 'BROADCAST' | 'HR' | 'ADMIN' | 'SPECIFIC';

export interface DirectoryRecipient {
  id: string;
  name: string;
  code: string;
  email: string;
  role: 'ADMIN' | 'HR' | 'EMPLOYEE';
  department: string;
  jobTitle: string;
  userId?: string;
  employeeId?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onNotificationSent: () => void;
}

export function SendNotificationDialog({ open, onClose, onNotificationSent }: Props) {
  const { user: currentUser } = useAuth();
  const [targetMode, setTargetMode] = useState<TargetDeliveryMode>('BROADCAST');
  const [directory, setDirectory] = useState<DirectoryRecipient[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<DirectoryRecipient | null>(null);

  const [type, setType] = useState<NotificationType>('SYSTEM_ALERT');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [metadataStr, setMetadataStr] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load directory when dialog opens
  useEffect(() => {
    if (!open) return;
    let active = true;

    setLoadingDirectory(true);

    Promise.allSettled([
      fetchEmployees({ all: true }),
      api.get<Array<{ id: string; email: string; fullName?: string; username?: string; role?: string; roles?: string[] }>>('/auth/users'),
    ])
      .then(([empResult, authResult]) => {
        if (!active) return;

        const options: DirectoryRecipient[] = [];

        // 1. Process Employees
        if (empResult.status === 'fulfilled' && empResult.value?.data) {
          for (const emp of empResult.value.data) {
            const isHr = Boolean(
              emp.isHr ||
              emp.department?.name?.toUpperCase().includes('HUMAN') ||
              emp.jobTitle?.toUpperCase().includes('HR') ||
              emp.role?.name?.toUpperCase().includes('HR') ||
              emp.email?.toLowerCase().includes('.hr@'),
            );

            let cleanTitle = emp.jobTitle || '';
            if (cleanTitle.includes('(Attendance)')) {
              cleanTitle = cleanTitle.replace(/\s*\(Attendance\)/i, '').trim();
            }
            if (isHr && (!cleanTitle || cleanTitle === 'Associate')) {
              cleanTitle = 'HR Specialist';
            }

            options.push({
              id: emp.employeeCode || emp.id,
              name: `${emp.firstName} ${emp.lastName}`.trim(),
              code: emp.employeeCode,
              email: emp.email,
              role: isHr ? 'HR' : 'EMPLOYEE',
              department: isHr ? 'Human Resources' : (emp.department?.name || 'General'),
              jobTitle: cleanTitle || (isHr ? 'HR Specialist' : 'Staff Associate'),
              userId: emp.employeeCode,
              employeeId: emp.employeeCode || emp.id,
            });
          }
        }

        // 2. Add System Administrator(s)
        const hasAdminEmail = options.some((o) => o.email.toLowerCase() === 'admin@company.com');
        if (!hasAdminEmail) {
          options.unshift({
            id: 'admin',
            name: 'System Administrator',
            code: 'ADMIN',
            email: 'admin@company.com',
            role: 'ADMIN',
            department: 'IT & System Administration',
            jobTitle: 'Super Administrator',
            userId: 'admin',
          });
        }

        // 3. Process extra Auth users (e.g. specialized HR or Admin users not in employees table)
        if (authResult.status === 'fulfilled' && Array.isArray(authResult.value.data)) {
          for (const u of authResult.value.data) {
            const emailLower = (u.email || '').toLowerCase();
            const exists = options.some((o) => o.email.toLowerCase() === emailLower);
            if (!exists && emailLower) {
              const isAdmin = emailLower.includes('admin') || (u.roles && u.roles.some((r) => r.includes('ADMIN')));
              const isHr = emailLower.includes('hr');
              const role: 'ADMIN' | 'HR' | 'EMPLOYEE' = isAdmin ? 'ADMIN' : isHr ? 'HR' : 'EMPLOYEE';
              const cleanCode = isAdmin ? 'ADMIN' : isHr ? 'HR-PORTAL' : (u.username || 'AUTH-USER');

              options.push({
                id: u.username || cleanCode,
                name: u.fullName || u.username || (isAdmin ? 'System Administrator' : 'HR Manager'),
                code: cleanCode,
                email: u.email,
                role,
                department: isAdmin ? 'IT & Security' : isHr ? 'Human Resources' : 'General',
                jobTitle: isAdmin ? 'Administrator' : isHr ? 'HR Portal Account' : 'User Account',
                userId: u.username || cleanCode,
              });
            }
          }
        }

        setDirectory(options);
        setLoadingDirectory(false);
      })
      .catch(() => {
        if (active) setLoadingDirectory(false);
      });

    return () => {
      active = false;
    };
  }, [open]);

  const handleTargetModeChange = (mode: TargetDeliveryMode) => {
    setTargetMode(mode);
    setError(null);
    if (mode !== 'SPECIFIC') {
      setSelectedRecipient(null);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!title.trim() || !body.trim()) {
      setError('Please provide a notification title and message body.');
      return;
    }

    let finalRecipientId = 'ALL';
    let finalRecipientType: string = 'BROADCAST';
    let matchedRecipient: DirectoryRecipient | null = selectedRecipient;

    if (targetMode === 'BROADCAST') {
      finalRecipientId = 'ALL';
      finalRecipientType = 'BROADCAST';
    } else if (targetMode === 'HR') {
      finalRecipientId = 'HR';
      finalRecipientType = 'HR';
    } else if (targetMode === 'ADMIN') {
      finalRecipientId = 'ADMIN';
      finalRecipientType = 'ADMIN';
    } else if (targetMode === 'SPECIFIC') {
      if (!selectedRecipient) {
        setError('Please select an employee or admin from the recipient dropdown.');
        return;
      }

      // Use clean employee code or email instead of raw database UUID so internal IDs are not exposed
      finalRecipientId = selectedRecipient.code || selectedRecipient.email || selectedRecipient.id;
      finalRecipientType = 'INDIVIDUAL';
      matchedRecipient = selectedRecipient;
    }

    let parsedMeta: Record<string, unknown> = {};
    if (metadataStr.trim()) {
      try {
        parsedMeta = JSON.parse(metadataStr);
      } catch {
        setError('Custom metadata must be valid JSON format (or left completely empty).');
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const senderDisplayName =
        currentUser?.fullName ||
        currentUser?.username ||
        (currentUser?.appRole === 'HR' ? 'HR Manager' : 'System Administrator');
      const senderFrom =
        currentUser?.appRole === 'HR'
          ? `${senderDisplayName} (HR)`
          : currentUser?.appRole === 'ADMIN'
          ? `${senderDisplayName} (Admin)`
          : senderDisplayName;

      const recipientDisplayName =
        targetMode === 'BROADCAST'
          ? 'All Staff'
          : targetMode === 'HR'
          ? 'Human Resources'
          : targetMode === 'ADMIN'
          ? 'Administrators'
          : matchedRecipient?.name || finalRecipientId;

      const cleanSenderUserId = currentUser?.username || (currentUser?.id && currentUser.id.length < 32 ? currentUser.id : undefined);

      const enrichedMeta: Record<string, unknown> = {
        ...parsedMeta,
        targetMode,
        senderName: senderDisplayName,
        from: senderFrom,
        senderUserId: cleanSenderUserId,
        senderEmail: currentUser?.email,
        senderRole: currentUser?.appRole || 'HR',
        recipientName: recipientDisplayName,
        to: recipientDisplayName,
        ...(matchedRecipient
          ? {
              recipientId: finalRecipientId,
              recipientUserId: matchedRecipient.code || matchedRecipient.userId,
              recipientEmployeeId: matchedRecipient.code || matchedRecipient.employeeId,
              employeeCode: matchedRecipient.code,
              email: matchedRecipient.email,
              recipientEmail: matchedRecipient.email,
              name: matchedRecipient.name,
              department: matchedRecipient.department,
              jobTitle: matchedRecipient.jobTitle,
              role: matchedRecipient.role,
            }
          : {}),
      };

      await sendNotification({
        recipientId: finalRecipientId,
        recipientType: finalRecipientType as any,
        type,
        title: title.trim(),
        body: body.trim(),
        metadata: enrichedMeta,
      });

      setTitle('');
      setBody('');
      setMetadataStr('');
      setSelectedRecipient(null);
      setTargetMode('BROADCAST');
      onNotificationSent();
      onClose();
    } catch {
      setError('Failed to dispatch notification. Please check network connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSend} noValidate>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Dispatch Notification / Alert</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Send real-time alerts and announcements to Employees, HR Staff, or Administrators.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Stack spacing={2.5}>
            {/* Delivery Target Selector (4 Options) */}
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Delivery Audience
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 1 }}>
                <Button
                  type="button"
                  variant={targetMode === 'BROADCAST' ? 'contained' : 'outlined'}
                  size="small"
                  startIcon={<CampaignIcon />}
                  onClick={() => handleTargetModeChange('BROADCAST')}
                  sx={{ textTransform: 'none', fontWeight: 700, py: 1 }}
                >
                  All Staff
                </Button>
                <Button
                  type="button"
                  variant={targetMode === 'HR' ? 'contained' : 'outlined'}
                  size="small"
                  color="secondary"
                  startIcon={<SupervisorAccountIcon />}
                  onClick={() => handleTargetModeChange('HR')}
                  sx={{ textTransform: 'none', fontWeight: 700, py: 1 }}
                >
                  All HR
                </Button>
                <Button
                  type="button"
                  variant={targetMode === 'ADMIN' ? 'contained' : 'outlined'}
                  size="small"
                  color="error"
                  startIcon={<AdminPanelSettingsIcon />}
                  onClick={() => handleTargetModeChange('ADMIN')}
                  sx={{ textTransform: 'none', fontWeight: 700, py: 1 }}
                >
                  All Admins
                </Button>
                <Button
                  type="button"
                  variant={targetMode === 'SPECIFIC' ? 'contained' : 'outlined'}
                  size="small"
                  color="primary"
                  startIcon={<PersonIcon />}
                  onClick={() => handleTargetModeChange('SPECIFIC')}
                  sx={{ textTransform: 'none', fontWeight: 700, py: 1 }}
                >
                  Specific Person
                </Button>
              </Box>
            </Box>

            {/* Audience Banner Context */}
            {targetMode === 'BROADCAST' && (
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#eff6ff', borderColor: '#bfdbfe' }}>
                <Typography variant="body2" sx={{ color: '#1e40af', fontWeight: 600 }}>
                  📢 <strong>Broadcast to Everyone:</strong> Delivered in real time to all active Employees, HR staff, and Administrators.
                </Typography>
              </Paper>
            )}

            {targetMode === 'HR' && (
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#fdf4ff', borderColor: '#f5d0fe' }}>
                <Typography variant="body2" sx={{ color: '#86198f', fontWeight: 600 }}>
                  👥 <strong>Human Resources Group:</strong> Delivered exclusively to all HR Managers and HR Specialists.
                </Typography>
              </Paper>
            )}

            {targetMode === 'ADMIN' && (
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#fef2f2', borderColor: '#fecaca' }}>
                <Typography variant="body2" sx={{ color: '#991b1b', fontWeight: 600 }}>
                  🛡️ <strong>System Administrators:</strong> Delivered exclusively to Super Admins and System Administrators.
                </Typography>
              </Paper>
            )}

            {/* Specific Person Directory Autocomplete */}
            {targetMode === 'SPECIFIC' && (
              <Box>
                <Autocomplete<DirectoryRecipient, false, false, false>
                  id="target-recipient-autocomplete"
                  forcePopupIcon
                  openOnFocus
                  options={directory}
                  loading={loadingDirectory}
                  value={selectedRecipient}
                  onChange={(_, newValue) => {
                    setSelectedRecipient(newValue);
                    if (error) setError(null);
                  }}
                  getOptionLabel={(option) => {
                    if (!option) return '';
                    return `${option.name} (${option.code})`;
                  }}
                  isOptionEqualToValue={(option, value) => {
                    if (!option || !value) return false;
                    return option.id === value.id || option.code === value.code;
                  }}
                  filterOptions={(options, params) => {
                    const q = params.inputValue.toLowerCase().trim();
                    const filtered = options.filter((opt) => {
                      if (!q) return true;
                      return (
                        opt.name.toLowerCase().includes(q) ||
                        opt.code.toLowerCase().includes(q) ||
                        opt.email.toLowerCase().includes(q) ||
                        opt.department.toLowerCase().includes(q) ||
                        opt.jobTitle.toLowerCase().includes(q) ||
                        opt.role.toLowerCase().includes(q)
                      );
                    });

                    const trimmed = params.inputValue.trim();
                    const isExisting = options.some(
                      (opt) =>
                        opt.code.toLowerCase() === trimmed.toLowerCase() ||
                        opt.email.toLowerCase() === trimmed.toLowerCase(),
                    );

                    if (trimmed !== '' && !isExisting) {
                      filtered.push({
                        id: `custom-${trimmed}`,
                        name: trimmed.includes('@') ? trimmed.split('@')[0] : `Direct ID (${trimmed})`,
                        code: trimmed,
                        email: trimmed.includes('@') ? trimmed : '',
                        role: 'EMPLOYEE',
                        department: 'Custom Recipient',
                        jobTitle: 'Manual Recipient',
                      });
                    }

                    return filtered;
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Recipient (Employee, HR, or Admin)"
                      placeholder="Type name, code, email, or role to search..."
                      size="small"
                      helperText="Choose an employee from the dropdown list or search by name / employee ID."
                    />
                  )}
                  renderOption={(props, option) => {
                    const { key, ...optionProps } = props;
                    const roleColor =
                      option.role === 'ADMIN'
                        ? { bg: '#f3e8ff', text: '#7e22ce', border: '#d8b4fe' }
                        : option.role === 'HR'
                        ? { bg: '#fdf4ff', text: '#c026d3', border: '#f5d0fe' }
                        : { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' };

                    return (
                      <li key={key || option.id} {...optionProps} style={{ cursor: 'pointer' }}>
                        <Box sx={{ width: '100%', py: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                {option.name}
                              </Typography>
                              <Chip
                                label={option.role}
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  bgcolor: roleColor.bg,
                                  color: roleColor.text,
                                  border: `1px solid ${roleColor.border}`,
                                }}
                              />
                            </Box>
                            <Chip
                              label={option.code}
                              size="small"
                              variant="outlined"
                              sx={{
                                height: 20,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                fontFamily: 'monospace',
                              }}
                            />
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                            {option.jobTitle} &bull; {option.department} &bull; {option.email || 'Direct Delivery'}
                          </Typography>
                        </Box>
                      </li>
                    );
                  }}
                />

                {selectedRecipient && (
                  <Paper
                    variant="outlined"
                    sx={{
                      mt: 1.5,
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: '#f8fafc',
                      borderColor: '#e2e8f0',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
                          Selected Recipient
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                          {selectedRecipient.name} ({selectedRecipient.code})
                        </Typography>
                      </Box>
                      <Chip
                        label={selectedRecipient.role}
                        size="small"
                        color={
                          selectedRecipient.role === 'ADMIN'
                            ? 'error'
                            : selectedRecipient.role === 'HR'
                            ? 'secondary'
                            : 'primary'
                        }
                        sx={{ fontWeight: 800, fontSize: '0.72rem' }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                      Email: <strong>{selectedRecipient.email}</strong> &bull; Dept: {selectedRecipient.department}
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}

            {/* Notification Type */}
            <FormControl fullWidth size="small">
              <InputLabel id="notif-type-label">Notification Type</InputLabel>
              <Select
                labelId="notif-type-label"
                value={type}
                label="Notification Type"
                onChange={(e) => setType(e.target.value as NotificationType)}
              >
                {NOTIFICATION_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t.replace(/_/g, ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Title */}
            <TextField
              label="Notification Title"
              placeholder="e.g. Mandatory Security Briefing"
              size="small"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              fullWidth
            />

            {/* Message Body */}
            <TextField
              label="Notification Message"
              placeholder="Write the notification body content here..."
              size="small"
              multiline
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              fullWidth
            />

            {/* Optional Custom Metadata (JSON) */}
            <TextField
              label="Custom Metadata (Optional JSON)"
              placeholder='e.g. {"actionUrl": "/reports", "priority": "high"}'
              size="small"
              multiline
              rows={2}
              value={metadataStr}
              onChange={(e) => setMetadataStr(e.target.value)}
              fullWidth
              helperText="Optional valid JSON object for deep links, routing, or event metadata."
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            startIcon={<SendIcon />}
            disabled={submitting}
            sx={{ fontWeight: 700, px: 2.5 }}
          >
            {submitting ? 'Dispatching...' : 'Send Notification'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
