import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import PeopleIcon from '@mui/icons-material/People';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { Employee, PageMeta } from '../../../types/employee';
import { EmployeeStatusBadge } from './EmployeeStatusBadge';
import { AccountStatusBadge } from './AccountStatusBadge';

interface Props {
  employees: Employee[];
  meta: PageMeta;
  loading: boolean;
  error: string | null;
  onPageChange: (newPage: number) => void;
  onRowsPerPageChange: (newLimit: number) => void;
  onView: (id: string) => void;
  onEdit?: (id: string) => void;
  onToggleStatus?: (employee: Employee) => void;
  onResendCredentials?: (employee: Employee) => void;
  onRetry: () => void;
  canManage?: boolean;
}

export function EmployeeTable({
  employees,
  meta,
  loading,
  error,
  onPageChange,
  onRowsPerPageChange,
  onView,
  onEdit: _onEdit,
  onToggleStatus: _onToggleStatus,
  onResendCredentials: _onResendCredentials,
  onRetry,
  canManage: _canManage = true,
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (error) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', my: 2 }}>
        <Typography color="error" variant="h6" gutterBottom>
          Failed to load employees
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {error}
        </Typography>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={onRetry}>
          Try Again
        </Button>
      </Paper>
    );
  }

  const renderEmptyState = () => (
    <Box sx={{ p: 6, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <PeopleIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5 }} />
      <Typography variant="h6" color="text.secondary">
        No employees found
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Try adjusting your search criteria or add a new employee.
      </Typography>
    </Box>
  );

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
      {/* Mobile Card List View (< 900px) */}
      {isMobile ? (
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Paper
                key={`mobile-skeleton-${index}`}
                variant="outlined"
                sx={{ p: 2, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Skeleton variant="circular" width={44} height={44} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="55%" height={22} />
                    <Skeleton variant="text" width="35%" height={16} />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Skeleton variant="rounded" width={80} height={24} />
                  <Skeleton variant="rounded" width={90} height={24} />
                </Box>
                <Skeleton variant="text" width="70%" height={18} />
              </Paper>
            ))
          ) : employees.length === 0 ? (
            renderEmptyState()
          ) : (
            employees.map((emp) => {
              const initials = `${emp.firstName?.charAt(0) || ''}${emp.lastName?.charAt(0) || ''}`.toUpperCase() || 'EMP';
              const isHr = Boolean(
                emp.role?.name?.toUpperCase().includes('HR') ||
                emp.jobTitle?.toUpperCase().includes('HR') ||
                (emp as any).designation?.title?.toUpperCase().includes('HR') ||
                emp.email?.toLowerCase().includes('.hr@')
              );

              return (
                <Paper
                  key={emp.id}
                  variant="outlined"
                  tabIndex={0}
                  role="button"
                  aria-label={`View employee details for ${emp.firstName} ${emp.lastName}`}
                  onClick={() => onView(emp.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onView(emp.id);
                    }
                  }}
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    borderRadius: 2,
                    borderColor: 'divider',
                    transition: 'all 0.15s ease-in-out',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'action.hover',
                    },
                    '&:focus-visible': {
                      outline: '2px solid #2563eb',
                      outlineOffset: 2,
                    },
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                  }}
                >
                  {/* Card Header: Avatar + Info + Chevron */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                      <Avatar
                        src={emp.profilePhotoUrl ?? undefined}
                        sx={{ bgcolor: 'primary.main', width: 44, height: 44, fontSize: '0.95rem', fontWeight: 700 }}
                      >
                        {initials}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, color: 'text.primary' }}>
                          {emp.firstName} {emp.lastName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', fontWeight: 600 }}>
                          {emp.employeeCode}
                        </Typography>
                      </Box>
                    </Box>
                    <ChevronRightIcon sx={{ color: 'text.secondary', fontSize: 22, ml: 1, flexShrink: 0 }} />
                  </Box>

                  {/* Badges Row */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
                    <EmployeeStatusBadge status={emp.status} />
                    <AccountStatusBadge
                      hasAccount={Boolean(emp.userId || emp.hasAccount)}
                      credentialsSentAt={emp.credentialsSentAt}
                    />
                    {isHr && (
                      <Chip
                        label="HR Web Linked"
                        size="small"
                        color="secondary"
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22 }}
                      />
                    )}
                    {emp.role?.name && (
                      <Chip
                        label={emp.role.name}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.72rem', height: 22 }}
                      />
                    )}
                  </Box>

                  {/* Title & Department */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {emp.jobTitle}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {emp.department?.name ?? 'No department'}
                    </Typography>
                  </Box>

                  {/* Office Locations */}
                  {(() => {
                    const validOffices = emp.assignedOffices?.filter(
                      (o) => o.name && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(o.name)
                    ) || [];
                    return validOffices.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {validOffices.map((o) => (
                          <Chip
                            key={o.id}
                            label={o.isPrimary ? `📍 ${o.name}` : o.name}
                            size="small"
                            variant={o.isPrimary ? 'filled' : 'outlined'}
                            color={o.isPrimary ? 'primary' : 'default'}
                            sx={{ fontSize: '0.68rem', height: 20, fontWeight: o.isPrimary ? 600 : 400 }}
                          />
                        ))}
                      </Box>
                    ) : emp.officeLocationName && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(emp.officeLocationName) ? (
                      <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
                        📍 {emp.officeLocationName}
                      </Typography>
                    ) : null;
                  })()}

                  {/* Contact Info */}
                  <Box sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <EmailIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="caption" sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {emp.email}
                      </Typography>
                    </Box>
                    {emp.phone && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <PhoneIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {emp.phone}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>
              );
            })
          )}
        </Box>
      ) : (
        /* Desktop Table View (>= 900px) */
        <TableContainer>
          <Table sx={{ minWidth: 750 }}>
            <TableHead sx={{ backgroundColor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Department & Title</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Account</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: meta.limit > 5 ? 5 : meta.limit }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Skeleton variant="circular" width={40} height={40} />
                        <Box sx={{ flex: 1 }}>
                          <Skeleton variant="text" width={120} height={20} />
                          <Skeleton variant="text" width={80} height={16} />
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="text" width={140} height={20} />
                      <Skeleton variant="text" width={100} height={16} />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="text" width={110} height={20} />
                      <Skeleton variant="text" width={90} height={16} />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="text" width={80} height={20} />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="rounded" width={70} height={24} />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="rounded" width={85} height={24} />
                    </TableCell>
                  </TableRow>
                ))
              ) : employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 6, textAlign: 'center' }}>
                    {renderEmptyState()}
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((emp) => {
                  const initials = `${emp.firstName?.charAt(0) || ''}${emp.lastName?.charAt(0) || ''}`.toUpperCase() || 'EMP';
                  const isHr = Boolean(
                    emp.isHr ||
                    emp.role?.name?.toUpperCase().includes('HR') ||
                    emp.jobTitle?.toUpperCase().includes('HR') ||
                    emp.department?.name?.toUpperCase().includes('HUMAN') ||
                    (emp as any).designation?.title?.toUpperCase().includes('HR') ||
                    emp.email?.toLowerCase().includes('.hr@')
                  );

                  let cleanJobTitle = emp.jobTitle || '';
                  if (cleanJobTitle.includes('(Attendance)')) {
                    cleanJobTitle = cleanJobTitle.replace(/\s*\(Attendance\)/i, '').trim();
                  }
                  if (isHr && (!cleanJobTitle || cleanJobTitle === 'Associate')) {
                    cleanJobTitle = 'HR Specialist';
                  }

                  const hrWebEmail =
                    emp.hrWebEmail ||
                    (isHr
                      ? emp.email.includes('.hr@')
                        ? emp.email
                        : emp.email.replace('@', '.hr@')
                      : undefined);

                  return (
                    <TableRow
                      key={emp.id}
                      hover
                      tabIndex={0}
                      role="button"
                      aria-label={`View employee details for ${emp.firstName} ${emp.lastName}`}
                      onClick={() => onView(emp.employeeCode || emp.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onView(emp.employeeCode || emp.id);
                        }
                      }}
                      sx={{
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease-in-out',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                        '&:focus-visible': {
                          outline: '2px solid #2563eb',
                          outlineOffset: '-2px',
                          backgroundColor: 'action.hover',
                        },
                        '&:last-child td, &:last-child th': { border: 0 },
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            src={emp.profilePhotoUrl ?? undefined}
                            sx={{ bgcolor: 'primary.main', width: 38, height: 38, fontSize: '0.875rem', fontWeight: 600 }}
                          >
                            {initials}
                          </Avatar>
                          <Box>
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 600, color: 'text.primary' }}
                            >
                              {emp.firstName} {emp.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {emp.employeeCode}
                              {emp.bloodGroup && (
                                <Box component="span" sx={{ ml: 1, color: 'error.main', fontWeight: 700, fontSize: '0.75rem' }}>
                                   {emp.bloodGroup}
                                </Box>
                              )}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {emp.email}
                        </Typography>
                        {isHr && hrWebEmail && (
                          <Typography variant="caption" sx={{ display: 'block', color: 'secondary.main', fontSize: '0.72rem', fontWeight: 700 }}>
                            HR Web Portal: {hrWebEmail}
                          </Typography>
                        )}
                        {emp.personalEmail && (
                          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.75rem' }}>
                            Personal: {emp.personalEmail}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {emp.phone}
                        </Typography>
                        {emp.alternatePhone && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.72rem' }}>
                            Alt: {emp.alternatePhone}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {cleanJobTitle}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {isHr ? 'Human Resources' : (emp.department?.name ?? '—')}
                        </Typography>
                        {(() => {
                          const validOffices = emp.assignedOffices?.filter(
                            (o) => o.name && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(o.name)
                          ) || [];
                          return validOffices.length > 0 ? (
                            <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {validOffices.map((o) => (
                                <Chip
                                  key={o.id}
                                  label={o.isPrimary ? `📍 ${o.name}` : o.name}
                                  size="small"
                                  variant={o.isPrimary ? 'filled' : 'outlined'}
                                  color={o.isPrimary ? 'primary' : 'default'}
                                  sx={{ fontSize: '0.68rem', height: 20, fontWeight: o.isPrimary ? 600 : 400 }}
                                />
                              ))}
                            </Box>
                          ) : emp.officeLocationName && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(emp.officeLocationName) ? (
                            <Typography variant="caption" sx={{ color: 'primary.main', fontSize: '0.72rem', fontWeight: 600, display: 'block', mt: 0.25 }}>
                              📍 {emp.officeLocationName}
                            </Typography>
                          ) : null;
                        })()}
                      </TableCell>

                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-start' }}>
                          <Typography variant="body2">
                            {isHr ? 'HR_ADMIN' : (emp.role?.name ?? 'EMPLOYEE')}
                          </Typography>
                          {isHr && (
                            <Chip
                              label="HR Web Linked"
                              size="small"
                              color="secondary"
                              variant="outlined"
                              sx={{ fontWeight: 700, fontSize: '0.68rem', height: 20 }}
                            />
                          )}
                        </Box>
                      </TableCell>

                      <TableCell>
                        <EmployeeStatusBadge status={emp.status} />
                      </TableCell>

                      <TableCell>
                        <AccountStatusBadge
                          hasAccount={Boolean(emp.userId || emp.hasAccount)}
                          credentialsSentAt={emp.credentialsSentAt}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <TablePagination
        rowsPerPageOptions={[10, 20, 50]}
        component="div"
        count={meta.total}
        rowsPerPage={meta.limit}
        page={meta.page - 1}
        onPageChange={(_e, newPage) => onPageChange(newPage + 1)}
        onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
        sx={{ borderTop: '1px solid', borderColor: 'divider' }}
      />
    </Paper>
  );
}
