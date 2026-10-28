import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';

import { downloadCsv } from '../utils/csvExport';
import { getUnifiedDeactivatedRecords } from '../../../utils/deactivationAudit';
import type { Employee } from '../../../types/employee';
import { PATHS } from '../../../routes/paths';

interface DeactivatedEmployeesReportProps {
  open: boolean;
  onClose: () => void;
  employees?: Employee[];
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase() || 'EM';
}

export function DeactivatedEmployeesReport({
  open,
  onClose,
  employees = [],
}: DeactivatedEmployeesReportProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'ALL' | 'ADMIN' | 'HR'>('ALL');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Load audit records unified with any inactive server records
  const allRecords = useMemo(() => {
    return getUnifiedDeactivatedRecords(employees);
  }, [employees, open]);

  // Filtered rows
  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRecords.filter((rec) => {
      if (filterRole !== 'ALL' && rec.deactivatedByRole !== filterRole) {
        return false;
      }
      if (!q) return true;
      return (
        rec.employeeName.toLowerCase().includes(q) ||
        rec.employeeCode.toLowerCase().includes(q) ||
        rec.email.toLowerCase().includes(q) ||
        rec.departmentName.toLowerCase().includes(q) ||
        rec.jobTitle.toLowerCase().includes(q) ||
        rec.deactivatedBy.toLowerCase().includes(q) ||
        rec.reason.toLowerCase().includes(q)
      );
    });
  }, [allRecords, search, filterRole]);

  // Statistics
  const adminCount = useMemo(
    () => allRecords.filter((r) => r.deactivatedByRole === 'ADMIN').length,
    [allRecords],
  );
  const hrCount = useMemo(
    () => allRecords.filter((r) => r.deactivatedByRole === 'HR').length,
    [allRecords],
  );

  const paginatedRecords = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredRecords.slice(start, start + rowsPerPage);
  }, [filteredRecords, page, rowsPerPage]);

  const handleExportCsv = () => {
    const headers = [
      'Employee Code',
      'Employee Name',
      'Email',
      'Department',
      'Job Title',
      'Office Location',
      'Deactivated Date & Time',
      'Deactivated By',
      'Deactivator Role',
      'Reason',
      'Status',
    ];

    const rows = filteredRecords.map((r) => [
      r.employeeCode,
      r.employeeName,
      r.email,
      r.departmentName,
      r.jobTitle,
      r.officeLocationName,
      formatDate(r.deactivatedAt),
      r.deactivatedBy,
      r.deactivatedByRole,
      r.reason,
      r.status,
    ]);

    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCsv(`Deactivated_Employees_Report_${dateStr}.csv`, headers, rows);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2.5, pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: 'error.lighter',
              color: 'error.main',
              display: 'flex',
            }}
          >
            <PersonOffIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Deactivated Employees Report
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Historical audit log of deactivated workforce staff • Timestamped records with initiating author details
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Close dialog">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, md: 3 } }}>
        {/* KPI Summary Tiles */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
            gap: 2,
            mb: 3,
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2.5,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              bgcolor: 'rgba(239, 68, 68, 0.04)',
              borderColor: 'rgba(239, 68, 68, 0.25)',
            }}
          >
            <Avatar sx={{ bgcolor: 'error.main', width: 44, height: 44 }}>
              <PersonOffIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'error.dark' }}>
                {allRecords.length}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Total Deactivated Personnel
              </Typography>
            </Box>
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2.5,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              bgcolor: 'rgba(37, 99, 235, 0.04)',
              borderColor: 'rgba(37, 99, 235, 0.25)',
            }}
          >
            <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44 }}>
              <AdminPanelSettingsIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.dark' }}>
                {adminCount}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Deactivated by Administrator
              </Typography>
            </Box>
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2.5,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              bgcolor: 'rgba(147, 51, 234, 0.04)',
              borderColor: 'rgba(147, 51, 234, 0.25)',
            }}
          >
            <Avatar sx={{ bgcolor: 'secondary.main', width: 44, height: 44 }}>
              <SupervisorAccountIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'secondary.dark' }}>
                {hrCount}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Deactivated by HR Specialist
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* Search & Filter Toolbar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
            mb: 2.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 260 }}>
            <TextField
              size="small"
              placeholder="Search by name, employee code, reason, or author..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="author-filter-label">Author Role</InputLabel>
              <Select
                labelId="author-filter-label"
                value={filterRole}
                label="Author Role"
                onChange={(e) => {
                  setFilterRole(e.target.value as any);
                  setPage(0);
                }}
              >
                <MenuItem value="ALL">All Roles</MenuItem>
                <MenuItem value="ADMIN">By Admin</MenuItem>
                <MenuItem value="HR">By HR</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Button
            variant="outlined"
            color="success"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportCsv}
            disabled={filteredRecords.length === 0}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Export CSV ({filteredRecords.length})
          </Button>
        </Box>

        {/* Data Table */}
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Employee</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Department & Job Title</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Deactivation Date & Time</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Deactivated By (Author)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Reason / Note</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 6 }}>
                    <PersonOffIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                      No Deactivated Employees Recorded
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {search || filterRole !== 'ALL'
                        ? 'No records match your search criteria.'
                        : 'Staff deactivated by Admin or HR will automatically be tracked in this section.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRecords.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 34, height: 34, bgcolor: 'error.main', fontSize: '0.8rem', fontWeight: 700 }}>
                          {getInitials(row.employeeName)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {row.employeeName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                            {row.employeeCode}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {row.departmentName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.jobTitle}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.dark' }}>
                        {formatDate(row.deactivatedAt)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.officeLocationName}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={row.deactivatedByRole === 'HR' ? 'HR' : 'ADMIN'}
                          color={row.deactivatedByRole === 'HR' ? 'secondary' : 'primary'}
                          size="small"
                          sx={{ fontWeight: 700, height: 22, fontSize: '0.7rem' }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {row.deactivatedBy}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: row.reason ? 'normal' : 'italic' }}>
                        {row.reason || 'No specific reason provided'}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Tooltip title="View Employee Profile">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => {
                            onClose();
                            navigate(PATHS.employeeDetails(row.employeeId));
                          }}
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredRecords.length > rowsPerPage && (
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredRecords.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, px: 3 }}>
        <Button onClick={onClose} variant="contained" color="inherit">
          Close Report
        </Button>
      </DialogActions>
    </Dialog>
  );
}
