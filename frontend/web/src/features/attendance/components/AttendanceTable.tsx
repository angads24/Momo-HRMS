import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Pagination from '@mui/material/Pagination';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import type { AttendanceSession } from '../types/attendance';
import { AttendanceStatusBadge, CheckInStatusBadge } from './AttendanceStatusBadge';

interface Props {
  sessions: AttendanceSession[];
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (newPage: number) => void;
  onViewDetails: (session: AttendanceSession) => void;
}

function formatSeconds(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hrs}h ${mins}m`;
}

function formatTime(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

export function AttendanceTable({
  sessions,
  loading,
  page,
  totalPages,
  total,
  onPageChange,
  onViewDetails,
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <CircularProgress size={36} />
        <Typography color="text.secondary">Loading attendance records...</Typography>
      </Paper>
    );
  }

  if (sessions.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          No Attendance Records Found
        </Typography>
        <Typography color="text.secondary" variant="body2">
          There are no attendance sessions matching your current filter criteria.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
      {isMobile ? (
        /* Mobile Cards List (< 900px) */
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {sessions.map((session) => (
            <Paper
              key={session.id}
              variant="outlined"
              onClick={() => onViewDetails(session)}
              sx={{
                p: 2,
                borderRadius: 2,
                cursor: 'pointer',
                borderColor: 'divider',
                transition: 'all 0.15s ease-in-out',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTimeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {session.attendanceDate}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                  <AttendanceStatusBadge status={session.status} />
                  <CheckInStatusBadge status={session.checkInStatus} />
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, py: 1, borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                    Check-In
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatTime(session.checkInAt)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                    Check-Out
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatTime(session.checkOutAt)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                    Worked
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', fontFamily: 'monospace' }}>
                    {formatSeconds(session.totalWorkingSeconds)}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Pauses: <strong>{session.pauses?.length ? `${session.pauses.length} (${formatSeconds(session.totalPausedSeconds || 0)})` : '0'}</strong>
                  </Typography>
                  {session.hasSpecialCondition && (
                    <Chip
                      size="small"
                      color="secondary"
                      variant="outlined"
                      label={`+${formatSeconds(session.specialConditionSeconds || 0)}`}
                      sx={{ fontSize: 10, height: 18, fontWeight: 700 }}
                    />
                  )}
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<VisibilityIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(session);
                  }}
                  sx={{ py: 0.25, px: 1, fontSize: '0.75rem' }}
                >
                  Details
                </Button>
              </Box>
            </Paper>
          ))}
        </Box>
      ) : (
        /* Desktop Table (>= 900px) */
        <TableContainer>
          <Table sx={{ minWidth: 700 }}>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Punctuality</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Check-In</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Check-Out</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Working Duration</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Pauses</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{session.attendanceDate}</TableCell>
                  <TableCell>
                    <AttendanceStatusBadge status={session.status} />
                  </TableCell>
                  <TableCell>
                    <CheckInStatusBadge status={session.checkInStatus} />
                  </TableCell>
                  <TableCell>{formatTime(session.checkInAt)}</TableCell>
                  <TableCell>{formatTime(session.checkOutAt)}</TableCell>
                  <TableCell>
                    <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>
                      {formatSeconds(session.totalWorkingSeconds)}
                    </Typography>
                    {session.hasSpecialCondition && (
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          size="small"
                          color="secondary"
                          variant="outlined"
                          label={`+${formatSeconds(session.specialConditionSeconds || 0)} Special`}
                          title={`Regular: ${formatSeconds(session.regularWorkingSeconds ?? (session.totalWorkingSeconds - (session.specialConditionSeconds || 0)))} | Reason: ${session.specialConditionReason || 'Special Condition'}`}
                          sx={{ fontSize: 10, height: 20, fontWeight: 700, bgcolor: 'secondary.50' }}
                        />
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    {session.pauses?.length ? `${session.pauses.length} (${formatSeconds(session.totalPausedSeconds || 0)})` : '0'}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<VisibilityIcon />}
                      onClick={() => onViewDetails(session)}
                    >
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Box
        sx={{
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Showing <strong>{sessions.length}</strong> of <strong>{total}</strong> records
        </Typography>
        {totalPages > 1 && (
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, val) => onPageChange(val)}
            color="primary"
            shape="rounded"
          />
        )}
      </Box>
    </Paper>
  );
}
