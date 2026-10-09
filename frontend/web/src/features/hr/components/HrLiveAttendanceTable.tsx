import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Avatar from '@mui/material/Avatar';
import Skeleton from '@mui/material/Skeleton';
import TablePagination from '@mui/material/TablePagination';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';


import Chip from '@mui/material/Chip';

export interface LiveAttendanceRow {
  id: string;
  employeeCode: string;
  name: string;
  department: string;
  location: string;
  checkInTime: string | null;
  status: 'WORKING' | 'PAUSED' | 'CHECKED_OUT' | 'ABSENT' | 'AUTO_CHECKED_OUT';
  workingTimeFormatted: string;
  pausedTimeFormatted: string;
  profilePhotoUrl?: string | null;
}

interface HrLiveAttendanceTableProps {
  rows: LiveAttendanceRow[];
  totalEmployees: number;
  loading?: boolean;
  onSelectEmployee?: (employeeId: string) => void;
  selectedFilterTab?: string;
  onClearFilter?: () => void;
}

function formatTabLabel(tabId: string): string {
  switch (tabId) {
    case 'present':
      return 'Present';
    case 'working':
      return 'Working';
    case 'paused':
      return 'Paused';
    case 'checked-out':
      return 'Checked Out';
    case 'absent':
      return 'Absent';
    case 'auto-checkout':
      return 'Auto Checkout';
    default:
      return 'All';
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase() || 'EM';
}

function getAvatarColor(name: string): string {
  const colors = [
    '#059669', // Emerald
    '#2563eb', // Blue
    '#dc2626', // Red
    '#16a34a', // Green
    '#0891b2', // Cyan
    '#7c3aed', // Purple
    '#d97706', // Amber
    '#db2777', // Pink
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export const HrLiveAttendanceTable: React.FC<HrLiveAttendanceTableProps> = ({
  rows,
  totalEmployees,
  loading = false,
  onSelectEmployee,
  selectedFilterTab = 'total',
  onClearFilter,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Reset pagination when filter tab changes
  React.useEffect(() => {
    setPage(0);
  }, [selectedFilterTab]);

  const paginatedRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const getStatusBadge = (status: LiveAttendanceRow['status']) => {
    switch (status) {
      case 'WORKING':
        return (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.8, color: '#16a34a', fontWeight: 700, fontSize: '0.82rem' }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#16a34a' }} />
            Working
          </Box>
        );
      case 'PAUSED':
        return (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.8, color: '#d97706', fontWeight: 700, fontSize: '0.82rem' }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#d97706' }} />
            Paused
          </Box>
        );
      case 'CHECKED_OUT':
        return (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.8, color: '#0284c7', fontWeight: 700, fontSize: '0.82rem' }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#0284c7' }} />
            Checked Out
          </Box>
        );
      case 'AUTO_CHECKED_OUT':
        return (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.8, color: '#7c3aed', fontWeight: 700, fontSize: '0.82rem' }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#7c3aed' }} />
            Auto Checkout
          </Box>
        );
      case 'ABSENT':
      default:
        return (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.8, color: '#ef4444', fontWeight: 700, fontSize: '0.82rem' }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#ef4444' }} />
            Absent
          </Box>
        );
    }
  };

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        bgcolor: '#ffffff',
        border: '1px solid #e2e8f0',
        mb: 3,
        overflow: 'hidden',
      }}
    >
      {/* Table Header */}
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem' }}>
              Live Attendance Monitor
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
              Click any employee to view their complete attendance & work reports
            </Typography>
          </Box>

          {selectedFilterTab && selectedFilterTab !== 'total' && (
            <Chip
              label={`Filter: ${formatTabLabel(selectedFilterTab)} (${rows.length})`}
              size="small"
              onDelete={onClearFilter}
              sx={{
                bgcolor: '#eff6ff',
                color: '#2563eb',
                fontWeight: 700,
                fontSize: '0.75rem',
                borderColor: '#bfdbfe',
                '& .MuiChip-deleteIcon': {
                  color: '#2563eb',
                  '&:hover': { color: '#1d4ed8' },
                },
              }}
              variant="outlined"
            />
          )}
        </Box>
        <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b' }}>
          Showing {rows.length > 0 ? Math.min(rowsPerPage, rows.length) : 0} of {rows.length} {selectedFilterTab !== 'total' ? 'filtered employees' : `of ${totalEmployees} total`}
        </Typography>
      </Box>

      {/* Content: Mobile Cards (< 900px) or Desktop Table (>= 900px) */}
      {isMobile ? (
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, n) => (
              <Paper
                key={`mobile-skeleton-${n}`}
                variant="outlined"
                sx={{ p: 2, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Skeleton variant="circular" width={40} height={40} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" height={22} />
                    <Skeleton variant="text" width="35%" height={16} />
                  </Box>
                </Box>
                <Skeleton variant="text" width="50%" height={18} />
                <Skeleton variant="rounded" width="100%" height={36} />
              </Paper>
            ))
          ) : paginatedRows.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No employees matching the current criteria.
              </Typography>
            </Box>
          ) : (
            paginatedRows.map((row) => {
              const initials = getInitials(row.name);
              const avatarBg = getAvatarColor(row.name);

              return (
                <Paper
                  key={row.id}
                  variant="outlined"
                  tabIndex={0}
                  role="button"
                  aria-label={`View attendance details for ${row.name}`}
                  onClick={() => onSelectEmployee?.(row.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectEmployee?.(row.id);
                    }
                  }}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    cursor: 'pointer',
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
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        src={row.profilePhotoUrl || undefined}
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: avatarBg,
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          color: '#ffffff',
                        }}
                      >
                        {initials}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, color: 'text.primary' }}>
                          {row.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', fontWeight: 600 }}>
                          {row.employeeCode}
                        </Typography>
                      </Box>
                    </Box>
                    {getStatusBadge(row.status)}
                  </Box>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      {row.department}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>•</Typography>
                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
                      📍 {row.location}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                        Check-In
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: row.checkInTime ? 'text.primary' : 'text.secondary' }}>
                        {row.checkInTime || '—'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                        Working
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
                        {row.workingTimeFormatted}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                        Paused
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.main' }}>
                        {row.pausedTimeFormatted}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              );
            })
          )}
        </Box>
      ) : (
        <TableContainer>
          <Table sx={{ minWidth: 700 }}>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5, py: 1.5 }}>
                  Employee
                </TableCell>
                <TableCell sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5, py: 1.5 }}>
                  Dept
                </TableCell>
                <TableCell sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5, py: 1.5 }}>
                  Location
                </TableCell>
                <TableCell sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5, py: 1.5 }}>
                  Check-In
                </TableCell>
                <TableCell sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5, py: 1.5 }}>
                  Status
                </TableCell>
                <TableCell sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5, py: 1.5 }}>
                  Working
                </TableCell>
                <TableCell sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5, py: 1.5 }}>
                  Paused
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                [1, 2, 3, 4, 5].map((n) => (
                  <TableRow key={n}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Skeleton variant="circular" width={36} height={36} />
                        <Box>
                          <Skeleton variant="text" width={110} height={20} />
                          <Skeleton variant="text" width={60} height={14} />
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell><Skeleton variant="text" width={80} /></TableCell>
                    <TableCell><Skeleton variant="text" width={80} /></TableCell>
                    <TableCell><Skeleton variant="text" width={50} /></TableCell>
                    <TableCell><Skeleton variant="text" width={70} /></TableCell>
                    <TableCell><Skeleton variant="text" width={60} /></TableCell>
                    <TableCell><Skeleton variant="text" width={50} /></TableCell>
                  </TableRow>
                ))
              ) : paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      No employees matching the current criteria.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row) => {
                  const initials = getInitials(row.name);
                  const avatarBg = getAvatarColor(row.name);

                  return (
                    <TableRow
                      key={row.id}
                      hover
                      tabIndex={0}
                      role="button"
                      aria-label={`View attendance details for ${row.name}`}
                      onClick={() => onSelectEmployee?.(row.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectEmployee?.(row.id);
                        }
                      }}
                      sx={{
                        cursor: 'pointer',
                        '&:last-child td, &:last-child th': { border: 0 },
                        transition: 'background-color 0.15s ease',
                        '&:hover': {
                          bgcolor: '#f1f5f9',
                        },
                        '&:focus-visible': {
                          outline: '2px solid #2563eb',
                          outlineOffset: '-2px',
                          bgcolor: '#eff6ff',
                        },
                      }}
                    >
                      {/* Employee Profile */}
                      <TableCell sx={{ py: 1.8 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            src={row.profilePhotoUrl || undefined}
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: avatarBg,
                              fontWeight: 800,
                              fontSize: '0.8rem',
                              color: '#ffffff',
                            }}
                          >
                            {initials}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                              {row.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, fontFamily: 'monospace' }}>
                              {row.employeeCode}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Department */}
                      <TableCell sx={{ color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>
                        {row.department}
                      </TableCell>

                      {/* Location */}
                      <TableCell sx={{ color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>
                        {row.location}
                      </TableCell>

                      {/* Check-In Time */}
                      <TableCell sx={{ color: row.checkInTime ? '#0f172a' : '#94a3b8', fontSize: '0.875rem', fontWeight: 600 }}>
                        {row.checkInTime || '—'}
                      </TableCell>

                      {/* Status with dot */}
                      <TableCell>
                        {getStatusBadge(row.status)}
                      </TableCell>

                      {/* Working Time */}
                      <TableCell sx={{ color: '#0f172a', fontSize: '0.875rem', fontWeight: 600 }}>
                        {row.workingTimeFormatted}
                      </TableCell>

                      {/* Paused Time */}
                      <TableCell sx={{ color: '#d97706', fontSize: '0.875rem', fontWeight: 600 }}>
                        {row.pausedTimeFormatted}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}


      {/* Pagination */}
      {!loading && rows.length > rowsPerPage && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={rows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          sx={{ borderTop: '1px solid #f1f5f9' }}
        />
      )}
    </Card>
  );
};
