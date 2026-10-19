import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Pagination from '@mui/material/Pagination';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import type { AppNotification } from '../types/notification';
import { NotificationTypeBadge } from './NotificationTypeBadge';

interface Props {
  notifications: AppNotification[];
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (newPage: number) => void;
  onMarkRead?: (notification: AppNotification) => void;
  onDelete: (notification: AppNotification) => void;
  onViewDetails: (notification: AppNotification) => void;
}

export function NotificationTable({
  notifications,
  loading,
  page,
  totalPages,
  total,
  onPageChange,
  onDelete,
  onViewDetails,
}: Props) {
  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <CircularProgress size={36} />
        <Typography color="text.secondary">Loading notifications...</Typography>
      </Paper>
    );
  }

  if (notifications.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          No Notifications
        </Typography>
        <Typography color="text.secondary" variant="body2">
          Your inbox is completely caught up. No messages or alerts at this time.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <TableContainer>
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: 40 }}></TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Notification</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Recipient</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {notifications.map((item) => (
              <TableRow
                key={item.id}
                hover
                tabIndex={0}
                role="button"
                aria-label={`View notification: ${item.title}`}
                onClick={() => onViewDetails(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onViewDetails(item);
                  }
                }}
                sx={{
                  cursor: 'pointer',
                  bgcolor: item.isRead ? 'inherit' : 'rgba(27, 75, 143, 0.04)',
                  transition: 'background-color 0.15s ease',
                  '&:hover': {
                    bgcolor: item.isRead ? 'rgba(0, 0, 0, 0.04)' : 'rgba(27, 75, 143, 0.08) !important',
                  },
                  '&:focus-visible': {
                    outline: '2px solid #2563eb',
                    outlineOffset: '-2px',
                    bgcolor: 'rgba(27, 75, 143, 0.1) !important',
                  },
                }}
              >
                <TableCell>
                  {!item.isRead && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                      }}
                    />
                  )}
                </TableCell>
                <TableCell>
                  <NotificationTypeBadge type={item.type} />
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" sx={{ fontWeight: item.isRead ? 600 : 800 }}>
                    {item.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {item.body}
                  </Typography>
                </TableCell>
                <TableCell>
                  {(() => {
                    const type = item.recipientType || 'EMPLOYEE';
                    const targetId = item.recipientId;
                    const meta = item.metadata as Record<string, any> | undefined;
                    const targetMode = meta?.targetMode || (item as any).targetMode;

                    // 1. Direct message to a Specific Person
                    if (targetMode === 'SPECIFIC' || (targetId !== 'ALL' && targetId !== 'HR' && targetId !== 'ADMIN')) {
                      const displayName =
                        item.to ||
                        item.recipientName ||
                        (meta?.name ? String(meta.name) : undefined) ||
                        item.recipientDisplay ||
                        (meta?.employeeCode ? String(meta.employeeCode) : undefined) ||
                        (targetId && targetId.startsWith('EMP-') ? targetId : 'Direct Recipient');

                      return (
                        <Chip
                          icon={<PersonIcon sx={{ fontSize: '0.85rem !important', color: '#475569 !important' }} />}
                          label={displayName}
                          size="small"
                          variant="outlined"
                          sx={{
                            height: 24,
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            bgcolor: '#f8fafc',
                            color: '#1e293b',
                            borderColor: '#cbd5e1',
                            '& .MuiChip-icon': {
                              ml: '6px',
                              mr: '-2px',
                            },
                          }}
                        />
                      );
                    }

                    // 2. Broadcast to All Staff
                    if (type === 'BROADCAST' || targetId === 'ALL') {
                      return (
                        <Chip
                          label="All Staff"
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            bgcolor: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                          }}
                        />
                      );
                    }

                    // 3. Department / Role announcements
                    if (type === 'HR' || targetId === 'HR') {
                      return (
                        <Chip
                          label="Human Resources"
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            bgcolor: '#fdf4ff',
                            color: '#a21caf',
                            border: '1px solid #f5d0fe',
                          }}
                        />
                      );
                    }

                    if (type === 'ADMIN' || targetId === 'ADMIN') {
                      return (
                        <Chip
                          label="Administrators"
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            bgcolor: '#fef2f2',
                            color: '#b91c1c',
                            border: '1px solid #fecaca',
                          }}
                        />
                      );
                    }

                    return null;
                  })()}
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(item.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </Typography>
                </TableCell>
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                    <IconButton
                      size="small"
                      color="error"
                      title="Delete Notification"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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
          Showing <strong>{notifications.length}</strong> of <strong>{total}</strong> notifications
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
