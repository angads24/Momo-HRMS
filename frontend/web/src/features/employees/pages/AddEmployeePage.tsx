import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Snackbar from '@mui/material/Snackbar';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import KeyIcon from '@mui/icons-material/Key';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import PersonIcon from '@mui/icons-material/Person';
import SendIcon from '@mui/icons-material/Send';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import ComputerIcon from '@mui/icons-material/Computer';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import { DashboardLayout } from '../../../components/DashboardLayout';
import { LoadingIndicator } from '../../../components/LoadingIndicator';
import { PATHS } from '../../../routes/paths';
import { useAuth } from '../../../context/AuthContext';
import { getErrorMessage } from '../../../utils/errors';
import { COMPANY_DOMAIN, INTERN_DOMAIN } from '../../../config/env';
import {
  createEmployeeWithRetry,
  fetchActiveDepartments,
  fetchRoles,
  generateUniqueEmail,
  resendCredentials,
} from '../../../services/employeeService';
import { fetchOffices } from '../../geofence/services/geofenceService';
import type { Office } from '../../geofence/types/geofence';
import type { CreateEmployeePayload, Department, Employee, EmploymentType, Role } from '../../../types/employee';

type FormRole = 'EMPLOYEE' | 'HR' | 'ADMIN';

export default function AddEmployeePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = Boolean(
    user?.roles?.includes('SUPER_ADMIN') ||
    user?.email?.toLowerCase().includes('admin')
  );

  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOfficeIds, setSelectedOfficeIds] = useState<string[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('EMPLOYEE');
  const [selectedRole, setSelectedRole] = useState<FormRole>('EMPLOYEE');
  const [personalEmail, setPersonalEmail] = useState('');
  const [autoSendCredentials, setAutoSendCredentials] = useState(true);

  // Dynamic Async Unique Email Resolution
  const [resolvedEmail, setResolvedEmail] = useState<string>('');
  const [resolvingEmails, setResolvingEmails] = useState(false);

  // Validation
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [officeError, setOfficeError] = useState<string | null>(null);

  // Post-Creation State
  const [createdEmployee, setCreatedEmployee] = useState<Employee | null>(null);
  const [resending, setResending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchActiveDepartments(), fetchRoles(), fetchOffices()])
      .then(([deptsData, rolesData, officesData]) => {
        if (mounted) {
          setDepartments(deptsData);
          setRoles(rolesData);
          setOffices(officesData);
          if (officesData.length > 0) {
            const activeOffice = officesData.find((o) => o.isActive) || officesData[0];
            setSelectedOfficeIds([activeOffice.id]);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load setup options:', err);
        setServerError(getErrorMessage(err, 'Unable to load roles, departments, or office locations.'));
      })
      .finally(() => {
        if (mounted) setLoadingInitial(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Compute live available unique emails with debounce across both employee and auth services
  useEffect(() => {
    let active = true;
    const trimmed = fullName.trim();
    if (!trimmed) {
      setResolvedEmail('');
      return;
    }

    const parts = trimmed.split(/\s+/);
    const first = parts[0];
    const last = parts.slice(1).join(' ');

    setResolvingEmails(true);
    const timer = setTimeout(async () => {
      try {
        const empEmail = await generateUniqueEmail(first, last, {
          isHr: false,
          isIntern: employmentType === 'INTERN',
        });
        if (active) {
          setResolvedEmail(empEmail);
        }
      } catch {
        // fallback to standard formats
      } finally {
        if (active) setResolvingEmails(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [fullName, employmentType]);

  // Synchronous fallback templates while async resolves
  const fallbackOfficialEmail = useMemo(() => {
    const trimmed = fullName.trim();
    const domain = employmentType === 'INTERN' ? INTERN_DOMAIN : COMPANY_DOMAIN;
    if (!trimmed) return `firstname.lastname@${domain}`;
    const parts = trimmed.split(/\s+/);
    const first = parts[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'firstname';
    const last = parts.length > 1 ? parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    const base = last ? `${first}.${last}` : first;
    return `${base}@${domain}`;
  }, [fullName, employmentType]);

  const validate = (): boolean => {
    let valid = true;
    setFullNameError(null);
    setEmailError(null);
    setOfficeError(null);

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setFullNameError('Full Name is required');
      valid = false;
    } else {
      const parts = trimmedName.split(/\s+/);
      if (parts.length < 2) {
        setFullNameError('Please enter both first and last name (e.g. Rohit Verma)');
        valid = false;
      }
    }

    if (selectedOfficeIds.length === 0) {
      setOfficeError(
        selectedRole === 'HR'
          ? 'Office jurisdiction is required for HR. The HR will only be able to view and manage staff from this designated office.'
          : 'Please select at least one workplace office location.'
      );
      valid = false;
    }

    const trimmedEmail = personalEmail.trim();
    if (!trimmedEmail) {
      setEmailError('Valid personal email address is required for credential delivery');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address (e.g. employee@gmail.com)');
      valid = false;
    }

    return valid;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setServerError(null);

    try {
      const parts = fullName.trim().split(/\s+/);
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ') || 'Employee';

      const hrRole = roles.find((r) => r.name.toUpperCase().includes('HR')) || roles[0];
      const employeeRole = roles.find((r) => r.name.toUpperCase() === 'EMPLOYEE') || roles[0];
      const adminRole =
        roles.find((r) => {
          const nameUpper = r.name.toUpperCase();
          return nameUpper.includes('SUPER') || nameUpper.includes('ADMIN');
        }) || roles[0];

      // Match department: prefer HR department if HR role
      const hrDepartment =
        departments.find((d) => d.status === 'ACTIVE' && (d.code === 'HR' || d.name.toUpperCase().includes('HUMAN'))) ||
        departments.find((d) => d.status === 'ACTIVE') ||
        departments[0];

      const defaultDepartment = departments.find((d) => d.status === 'ACTIVE') || departments[0];

      const matchedRole =
        selectedRole === 'ADMIN' ? adminRole : selectedRole === 'HR' ? hrRole : employeeRole;
      const matchedDepartment = selectedRole === 'HR' ? hrDepartment : defaultDepartment;
      const finalEmail =
        resolvedEmail ||
        (await generateUniqueEmail(firstName, lastName, {
          isHr: false,
          isIntern: employmentType === 'INTERN',
        }));

      const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
      const employeeCode = `EMP-${uniqueSuffix}`;
      const jobTitle =
        selectedRole === 'ADMIN'
          ? 'System Administrator'
          : selectedRole === 'HR'
          ? 'HR Specialist'
          : employmentType === 'INTERN'
          ? 'Intern Trainee'
          : 'Associate';

      const selectedOffices = offices.filter((o) => selectedOfficeIds.includes(o.id));
      const primaryOffice = selectedOffices[0];
      const assignedOfficeId = primaryOffice?.id || selectedOfficeIds[0] || undefined;
      const assignedOfficeName = selectedOffices.map((o) => (o.name ? `${o.name} (${o.code})` : o.code)).join(', ') || undefined;
      const assignedOfficeIds = selectedOffices.flatMap((o) => [o.id, o.code]).filter(Boolean) as string[];

      const payload: CreateEmployeePayload = {
        employeeCode,
        firstName,
        lastName,
        email: finalEmail,
        personalEmail: personalEmail.trim().toLowerCase(),
        phone: '+91 90000 00000',
        dateOfJoining: new Date().toISOString().slice(0, 10),
        jobTitle,
        departmentId: matchedDepartment.id,
        roleId: matchedRole.id,
        provisionAccount: true,
        sendEmail: autoSendCredentials,
        officeLocationId: assignedOfficeId,
        officeLocationName: assignedOfficeName,
        primaryOfficeId: assignedOfficeId,
        officeIds: assignedOfficeIds,
      };

      const created = await createEmployeeWithRetry(payload, {
        isHr: false,
        isIntern: employmentType === 'INTERN',
      });
      setCreatedEmployee(created);
      setFeedback(
        created.credentialDelivery?.message ||
        (created.credentialDelivery?.delivered
          ? `Credentials dispatched to ${personalEmail.trim()}`
          : autoSendCredentials
          ? `${selectedRole === 'HR' ? 'HR Account' : 'User'} created! Credentials dispatched to ${personalEmail.trim()}.`
          : `${selectedRole === 'HR' ? 'HR Account' : 'User'} created successfully with generated credentials.`)
      );

    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to create employee. Please try again.');
      if (
        msg.toLowerCase().includes('already account is created') ||
        msg.toLowerCase().includes('duplicate_email') ||
        msg.toLowerCase().includes('already exists')
      ) {
        setEmailError('already account is created!');
        setServerError('already account is created!');
      } else {
        setServerError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCredentials = async () => {
    const target = createdEmployee;
    if (!target) return;
    setResending(true);
    try {
      const res = await resendCredentials(target.id);
      setFeedback(res.message || `Credentials re-sent to ${target.personalEmail || target.email}`);
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to re-send credentials.');
      setServerError(msg);
    } finally {
      setResending(false);
    }
  };

  const handleCreateAnother = () => {
    setCreatedEmployee(null);
    setFullName('');
    setPersonalEmail('');
    setEmploymentType('EMPLOYEE');
    setSelectedRole('EMPLOYEE');
    setServerError(null);
    setOfficeError(null);
    if (offices.length > 0) {
      const activeOffice = offices.find((o) => o.isActive) || offices[0];
      setSelectedOfficeIds([activeOffice.id]);
    }
    setResolvedEmail('');
  };

  if (loadingInitial) {
    return (
      <DashboardLayout title="Create New Employee" subtitle="Loading setup options...">
        <LoadingIndicator message="Preparing employee creation..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Create New Employee"
      subtitle="Register an employee profile, automatically generate company credentials, and deliver them to their personal email."
    >
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          color="inherit"
          onClick={() => navigate(PATHS.employees)}
        >
          Back to Employee Directory
        </Button>
      </Box>

      {/* Post-Creation Confirmation Screen */}
      {createdEmployee ? (
        /* Success Card for Standard Employee / Admin */
        <Card variant="outlined" sx={{ maxWidth: 720, mx: 'auto', p: 2, borderColor: 'success.main', borderWidth: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <CheckCircleIcon color="success" sx={{ fontSize: 44 }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  User Account Created Successfully!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  The employee profile has been saved and credentials have been dispatched.
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* HERO CREDENTIALS BANNER */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                mb: 3,
                borderRadius: 2.5,
                bgcolor: '#fffbeb',
                border: '2px solid #f59e0b',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <KeyIcon sx={{ color: '#d97706', fontSize: 30 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#92400e', lineHeight: 1.2 }}>
                    Generated Official Credentials
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#b45309', fontWeight: 500 }}>
                    Provide these credentials to the user so they can log in immediately:
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 1.5 }}>
                <Box sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #fde68a' }}>
                  <Typography variant="caption" sx={{ color: '#78350f', fontWeight: 700, textTransform: 'uppercase' }}>
                    Login ID (Official Email)
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: 'monospace', color: '#1e293b', wordBreak: 'break-all', mt: 0.5 }}>
                    {createdEmployee.email}
                  </Typography>
                </Box>

                <Box sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: 2, border: '2px solid #f59e0b' }}>
                  <Typography variant="caption" sx={{ color: '#92400e', fontWeight: 800, textTransform: 'uppercase' }}>
                    Temporary Password
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'monospace', color: '#d97706', letterSpacing: '0.06em', mt: 0.5 }}>
                    {createdEmployee.temporaryPassword || 'Saved in Database'}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, mt: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<ContentCopyIcon fontSize="small" />}
                  sx={{ bgcolor: '#d97706', '&:hover': { bgcolor: '#b45309' }, fontWeight: 700 }}
                  onClick={() => {
                    if (createdEmployee.temporaryPassword) {
                      navigator.clipboard.writeText(createdEmployee.temporaryPassword);
                      setFeedback('Temporary password copied to clipboard!');
                    }
                  }}
                >
                  Copy Password
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ContentCopyIcon fontSize="small" />}
                  sx={{ color: '#92400e', borderColor: '#d97706', '&:hover': { borderColor: '#b45309', bgcolor: '#fef3c7' }, fontWeight: 600 }}
                  onClick={() => {
                    const full = selectedRole === 'HR'
                      ? `Momo HRMS HR Account\nUser: ${createdEmployee.firstName} ${createdEmployee.lastName}\nRole: HR_ADMIN\nLogin Email: ${createdEmployee.email}\nTemporary Password: ${createdEmployee.temporaryPassword || 'Saved in Database'}\nWeb Portal: ${window.location.origin}/login\nMobile App: Momo HRMS App`
                      : `Momo HRMS Credentials\nUser: ${createdEmployee.firstName} ${createdEmployee.lastName}\nLogin Email: ${createdEmployee.email}\nTemporary Password: ${createdEmployee.temporaryPassword || 'Saved in Database'}\nLogin URL: ${window.location.origin}/login`;
                    navigator.clipboard.writeText(full);
                    setFeedback('Full credentials copied to clipboard!');
                  }}
                >
                  Copy Full Credentials
                </Button>
              </Box>
            </Paper>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, bgcolor: 'background.default', p: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">Full Name:</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {createdEmployee.firstName} {createdEmployee.lastName}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">Employee Code:</Typography>
                <Chip label={createdEmployee.employeeCode} size="small" sx={{ fontWeight: 600 }} />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">Employment Type:</Typography>
                <Chip
                  label={createdEmployee.employmentType || employmentType}
                  color={employmentType === 'INTERN' ? 'secondary' : 'primary'}
                  size="small"
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">Role & Access:</Typography>
                <Chip
                  icon={selectedRole === 'EMPLOYEE' ? <SmartphoneIcon fontSize="small" /> : <ComputerIcon fontSize="small" />}
                  label={
                    selectedRole === 'ADMIN'
                      ? 'Admin (Web Portal)'
                      : selectedRole === 'HR'
                      ? 'HR Admin (Web & Mobile App)'
                      : 'Employee (Mobile App Only)'
                  }
                  color={selectedRole === 'EMPLOYEE' ? 'primary' : 'secondary'}
                  size="small"
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">Official Company Email (Login ID):</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', color: 'primary.main' }}>
                  {createdEmployee.email}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">Personal Email (Recipient):</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {createdEmployee.personalEmail}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">Assigned Workplaces:</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(createdEmployee.assignedOffices || []).length > 0 ? (
                    createdEmployee.assignedOffices!.map((o) => (
                      <Chip
                        key={o.id}
                        icon={<LocationOnIcon fontSize="small" />}
                        label={`${o.name} (${o.code})${o.isPrimary ? ' • Primary' : ''}`}
                        color={o.isPrimary ? 'primary' : 'default'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    ))
                  ) : (
                    <Chip
                      icon={<LocationOnIcon fontSize="small" />}
                      label={createdEmployee.officeLocationName || 'Headquarters'}
                      color="default"
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  )}
                </Box>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">Password Status:</Typography>
                <Chip label="Generated Temporary Password (Reset on First Login)" color="info" size="small" variant="outlined" />
              </Box>

              {createdEmployee.temporaryPassword && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, p: 1.5, bgcolor: 'rgba(25, 118, 210, 0.08)', borderRadius: 1.5, border: '1px dashed', borderColor: 'primary.main' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.dark' }}>Temporary Password:</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: 'monospace', bgcolor: 'background.paper', px: 1.5, py: 0.5, borderRadius: 1, border: '1px solid', borderColor: 'divider', letterSpacing: '0.05em' }}>
                      {createdEmployee.temporaryPassword}
                    </Typography>
                    <Tooltip title="Copy temporary password">
                      <IconButton size="small" color="primary" onClick={() => navigator.clipboard.writeText(createdEmployee.temporaryPassword || '')}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              )}
            </Box>

            {createdEmployee.credentialDelivery?.delivered ? (
              <Alert severity="success" sx={{ mt: 3, mb: 3 }}>
                {createdEmployee.credentialDelivery.message || `An official credential email with the login ID, temporary password, and platform login link has been sent to ${createdEmployee.personalEmail}.`}
              </Alert>
            ) : (
              <Alert severity={createdEmployee.credentialDelivery?.mode === 'failed' ? 'warning' : 'info'} sx={{ mt: 3, mb: 3 }}>
                {createdEmployee.credentialDelivery?.message || `Employee profile created. Credential delivery status: ${createdEmployee.credentialDelivery?.mode || 'saved'}.`}
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<SendIcon />}
                disabled={resending}
                onClick={handleResendCredentials}
              >
                {resending ? 'Sending...' : 'Send Credentials Again'}
              </Button>
              <Button
                variant="outlined"
                onClick={handleCreateAnother}
              >
                Create Another Employee
              </Button>
              <Button
                variant="contained"
                startIcon={<VisibilityIcon />}
                onClick={() => navigate(PATHS.employeeDetails(createdEmployee.id))}
              >
                View Employee Profile
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        /* Creation Form */
        <Paper variant="outlined" sx={{ maxWidth: 680, mx: 'auto', p: { xs: 3, sm: 4.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <PersonAddAlt1Icon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              New Employee Setup
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Register new staff member. Official company email and a temporary secure password will be generated automatically.
          </Typography>

          {serverError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {serverError}
            </Alert>
          )}

          <form onSubmit={handleCreate} noValidate>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Field 1: Full Name */}
              <TextField
                required
                fullWidth
                label="Full Name"
                placeholder="e.g. Rohit Verma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                error={Boolean(fullNameError)}
                helperText={fullNameError ?? 'Enter first and last name'}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              {/* Field 2: Person Type (EMPLOYEE vs INTERN) */}
              <FormControl fullWidth required>
                <InputLabel id="employment-type-label">Type (Employee vs Intern)</InputLabel>
                <Select
                  labelId="employment-type-label"
                  label="Type (Employee vs Intern)"
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                >
                  <MenuItem value="EMPLOYEE">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Chip label={`@${COMPANY_DOMAIN}`} size="small" color="primary" variant="outlined" />
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>Employee</Typography>
                        <Typography variant="caption" color="text.secondary">Standard company employee (generates @{COMPANY_DOMAIN})</Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                  <MenuItem value="INTERN">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Chip label={`@${INTERN_DOMAIN}`} size="small" color="secondary" variant="outlined" />
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>Intern</Typography>
                        <Typography variant="caption" color="text.secondary">Internship staff member (generates @{INTERN_DOMAIN})</Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                </Select>
                <FormHelperText>
                  {employmentType === 'EMPLOYEE'
                    ? `Official Company Email Domain: @${COMPANY_DOMAIN}`
                    : `Official Company Email Domain: @${INTERN_DOMAIN}`}
                </FormHelperText>
              </FormControl>

              {/* Field 3: Role Selection */}
              <FormControl fullWidth required>
                <InputLabel id="role-select-label">Access / Role</InputLabel>
                <Select
                  labelId="role-select-label"
                  label="Access / Role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as FormRole)}
                >
                  <MenuItem value="EMPLOYEE">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <SmartphoneIcon color="primary" fontSize="small" />
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>EMPLOYEE</Typography>
                        <Typography variant="caption" color="text.secondary">Mobile App Attendance & Profile Only</Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                  <MenuItem value="HR">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <SupervisorAccountIcon color="secondary" fontSize="small" />
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>HR</Typography>
                        <Typography variant="caption" color="text.secondary">Web Management Portal + Mobile Attendance (Single Account)</Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                  {isSuperAdmin && (
                    <MenuItem value="ADMIN">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <ComputerIcon color="error" fontSize="small" />
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>ADMIN</Typography>
                          <Typography variant="caption" color="text.secondary">Full Administrative Web Portal Access (Super Admin Only)</Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  )}
                </Select>
                <FormHelperText>
                  {selectedRole === 'HR'
                    ? '👥 HR Role: Creates a unified account with access to both the Web Management Portal and Mobile App.'
                    : selectedRole === 'EMPLOYEE'
                    ? '📱 Standard employees sign in via the Momo HRMS Mobile App.'
                    : '💻 Administrative roles have access to the Momo HRMS Web Management Portal (Restricted to Super Admin creators).'}
                </FormHelperText>
              </FormControl>

              {/* Field 4: Office Location & Geofence Assignment (Multiple Locations Support) */}
              {selectedRole === 'HR' && (
                <Alert
                  severity="info"
                  icon={<LocationOnIcon />}
                  sx={{ borderRadius: 2, bgcolor: 'rgba(156, 39, 176, 0.06)', borderColor: 'secondary.light', borderWidth: 1, borderStyle: 'solid' }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'secondary.dark' }}>
                    HR Workplace Scope & Staff Visibility
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.82rem', mt: 0.5 }}>
                    The office selected below is assigned as this HR's <strong>Jurisdiction</strong>. In the HR portal, this HR will <strong>only</strong> see employees, live attendance monitors, working hours, and analytics for staff belonging to this office.
                  </Typography>
                </Alert>
              )}

              <FormControl fullWidth required error={Boolean(officeError)} disabled={submitting}>
                <InputLabel id="office-location-label">
                  {selectedRole === 'HR' ? 'Assigned Workplace Jurisdiction *' : 'Assigned Office Locations *'}
                </InputLabel>
                <Select
                  labelId="office-location-label"
                  label={selectedRole === 'HR' ? 'Assigned Workplace Jurisdiction *' : 'Assigned Office Locations *'}
                  multiple
                  value={selectedOfficeIds}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedOfficeIds(typeof value === 'string' ? value.split(',') : value);
                    if (officeError) setOfficeError(null);
                  }}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((id, idx) => {
                        const off = offices.find((o) => o.id === id);
                        return (
                          <Chip
                            key={id}
                            label={`${off ? off.name : id}${idx === 0 ? ' (Primary Scope)' : ''}`}
                            size="small"
                            color={idx === 0 ? (selectedRole === 'HR' ? 'secondary' : 'primary') : 'default'}
                          />
                        );
                      })}
                    </Box>
                  )}
                  startAdornment={
                    <InputAdornment position="start">
                      <LocationOnIcon color={selectedRole === 'HR' ? 'secondary' : 'action'} />
                    </InputAdornment>
                  }
                >
                  {offices.map((office) => (
                    <MenuItem key={office.id} value={office.id}>
                      <Checkbox checked={selectedOfficeIds.indexOf(office.id) > -1} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>{office.name}</Typography>
                        <Chip label={office.code} size="small" variant="outlined" />
                        {office.city && <Typography variant="caption" color="text.secondary">({office.city})</Typography>}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText error={Boolean(officeError)}>
                  {officeError || (
                    selectedRole === 'HR'
                      ? 'The selected office defines this HR user\'s scope. Staff assigned to this workplace will be visible to this HR in the HR portal.'
                      : 'Select all workplaces this employee is authorized to work and record attendance at. The first selected office is designated as Primary.'
                  )}
                </FormHelperText>
              </FormControl>

              {/* Field 5: Valid Personal Email */}
              <TextField
                required
                fullWidth
                type="email"
                label="Valid Personal Email Address"
                placeholder="e.g. employee@gmail.com"
                value={personalEmail}
                onChange={(e) => {
                  setPersonalEmail(e.target.value);
                  if (emailError) setEmailError(null);
                  if (serverError === 'already account is created!') setServerError(null);
                }}
                error={Boolean(emailError)}
                helperText={emailError ?? 'Official login credentials will be dispatched to this personal email address.'}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailOutlinedIcon color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              {/* Preview Cards */}
              {selectedRole === 'HR' ? (
                /* HR ACCOUNT INFORMATION PREVIEW */
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    bgcolor: 'rgba(156, 39, 176, 0.04)',
                    borderColor: 'secondary.main',
                    borderRadius: 2,
                    borderWidth: 1.5,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <SupervisorAccountIcon color="secondary" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'secondary.dark' }}>
                      HR ACCOUNT INFORMATION (SINGLE UNIFIED LOGIN)
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    A single official company account provides access to both the HR Web Management Portal and Mobile App:
                  </Typography>

                  <Card variant="outlined" sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <ComputerIcon color="secondary" fontSize="small" />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Unified HR Account (Web & Mobile Access)
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      <strong>Login ID / Company Email:</strong>
                    </Typography>
                    <Box sx={{ bgcolor: 'grey.100', p: 1, borderRadius: 1, fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, color: 'secondary.main' }}>
                      {resolvingEmails ? 'Checking availability...' : resolvedEmail || fallbackOfficialEmail}
                    </Box>
                    <Chip label="Role: HR Admin (Web + Mobile App)" size="small" color="secondary" sx={{ mt: 1, fontWeight: 600, height: 22, fontSize: '0.75rem' }} />
                  </Card>

                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.paper', borderRadius: 1.5, border: '1px dashed', borderColor: 'secondary.main' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'secondary.dark', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationOnIcon fontSize="inherit" /> Assigned Workplace Jurisdiction Scope:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                      {selectedOfficeIds.length > 0
                        ? offices.filter((o) => selectedOfficeIds.includes(o.id)).map((o) => `${o.name} (${o.code})`).join(', ')
                        : '⚠️ No office selected yet (Required)'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                      * Only staff members assigned to this office will be visible to this HR in the HR dashboard and directory.
                    </Typography>
                  </Box>
                </Paper>
              ) : (
                /* Standard Provisioning Preview */
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', display: 'block', mb: 1 }}>
                    Automatic Setup Preview
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <Typography variant="caption" color="text.secondary">Company Login Email:</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                        {resolvingEmails ? 'Checking availability...' : resolvedEmail || fallbackOfficialEmail}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <Typography variant="caption" color="text.secondary">Temporary Password:</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                        Generated securely by Auth Service
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <Typography variant="caption" color="text.secondary">Target Platform:</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {selectedRole === 'EMPLOYEE' ? 'Momo HRMS Mobile App' : 'Momo HRMS Web Portal'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <Typography variant="caption" color="text.secondary">Assigned Workplace(s):</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {selectedOfficeIds.length > 0
                          ? offices.filter((o) => selectedOfficeIds.includes(o.id)).map((o) => o.name).join(', ')
                          : 'None Selected'}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              )}

              <FormControlLabel
                control={
                  <Switch
                    checked={autoSendCredentials}
                    onChange={(e) => setAutoSendCredentials(e.target.checked)}
                    color="primary"
                  />
                }
                label="Automatically send credentials to personal email on creation"
              />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate(PATHS.employees)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={submitting}
                  startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                >
                  {submitting ? 'Creating User...' : selectedRole === 'HR' ? 'Create HR' : 'Create User'}
                </Button>
              </Box>
            </Box>
          </form>
        </Paper>
      )}

      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={6000}
        onClose={() => setFeedback(null)}
        message={feedback}
      />
    </DashboardLayout>
  );
}
