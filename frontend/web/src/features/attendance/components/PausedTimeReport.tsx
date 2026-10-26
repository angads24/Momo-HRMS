import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import type { AttendanceSession } from '../types/attendance';
import type { Employee } from '../../../types/employee';
import { downloadCsv } from '../utils/csvExport';

interface PausedTimeReportProps {
  open: boolean;
  onClose: () => void;
  sessions: AttendanceSession[];
  employees?: Employee[];
}

export function PausedTimeReport({
  open,
  onClose,
  sessions,
  employees = [],
}: PausedTimeReportProps) {
  const dates = sessions.map((s) => s.attendanceDate).sort();
  const defaultStart = dates[0] || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const defaultEnd = dates[dates.length - 1] || new Date().toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const empMap = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const e of employees) {
      if (e.id) map.set(e.id, e);
      if (e.employeeCode) map.set(e.employeeCode, e);
    }
    return map;
  }, [employees]);

  // Filter sessions that have recorded paused time
  const pausedSessions = useMemo(() => {
    return sessions.filter((s) => {
      const hasPause = (s.totalPausedSeconds || 0) > 0 || (s.pauses && s.pauses.length > 0) || s.status === 'PAUSED';
      if (!hasPause) return false;
      if (startDate && s.attendanceDate < startDate) return false;
      if (endDate && s.attendanceDate > endDate) return false;
      return true;
    });
  }, [sessions, startDate, endDate]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pausedSessions;
    return pausedSessions.filter((s) => {
      const emp = empMap.get(s.employeeId);
      const name = emp ? `${emp.firstName} ${emp.lastName}`.toLowerCase() : '';
      const code = (emp?.employeeCode || s.employeeId).toLowerCase();
      const dept = (emp?.department?.name || '').toLowerCase();
      return name.includes(q) || code.includes(q) || dept.includes(q);
    });
  }, [pausedSessions, search, empMap]);

  const totalPausedSeconds = filteredRows.reduce((acc, s) => acc + (s.totalPausedSeconds || 0), 0);
  const totalPausedMinutes = Math.round(totalPausedSeconds / 60);
  const totalPausedHours = (totalPausedSeconds / 3600).toFixed(1);

  const handleExport = () => {
    const headers = [
      'Employee Code',
      'Employee Name',
      'Department',
      'Attendance Date',
      'Pauses Count',
      'Total Paused Minutes',
      'Total Paused Hours',
      'Working Hours Recorded',
      'Current Session Status',
    ];
    const rows = filteredRows.map((s) => {
      const emp = empMap.get(s.employeeId);
      const name = emp ? `${emp.firstName} ${emp.lastName}` : 'N/A';
      const code = emp?.employeeCode || s.employeeId;
      const dept = emp?.department?.name || 'General';
      const pausesCount = s.pauses ? s.pauses.length : (s.totalPausedSeconds > 0 ? 1 : 0);
      const mins = Math.round((s.totalPausedSeconds || 0) / 60);
      const hrs = ((s.totalPausedSeconds || 0) / 3600).toFixed(2);
      const workHrs = (s.totalWorkingSeconds / 3600).toFixed(2);
      return [code, name, dept, s.attendanceDate, pausesCount, mins, hrs, workHrs, s.status];
    });
    downloadCsv(`paused_time_report_${startDate}_to_${endDate}`, headers, rows);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth slotProps={{ paper: { sx: { borderRadius: 2.5 } } }}>
      <DialogTitle sx={{ m: 0, p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(217, 119, 6, 0.08)', color: 'warning.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PauseCircleIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Paused Time Report
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Duration of time staff spent outside geofence boundary or on pause
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Controls Bar */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              label="From Date"
              type="date"
              size="small"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ width: 160 }}
            />
            <TextField
              label="To Date"
              type="date"
              size="small"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ width: 160 }}
            />
            <TextField
              placeholder="Search staff, code..."
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: 260 }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={`Sessions with Pauses: ${filteredRows.length}`} color="warning" variant="outlined" sx={{ fontWeight: 600 }} />
            <Chip label={`Total Paused: ${totalPausedMinutes}m (${totalPausedHours}h)`} sx={{ fontWeight: 700, bgcolor: 'rgba(217, 119, 6, 0.08)', color: 'warning.dark' }} />
          </Box>
        </Box>

        {/* Table */}
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Attendance Date</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Pause Count</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Total Paused Time</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Working Hours</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                    No paused time sessions recorded in this period.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((s) => {
                    const emp = empMap.get(s.employeeId);
                    const name = emp ? `${emp.firstName} ${emp.lastName}` : s.employeeId;
                    const code = emp?.employeeCode || s.employeeId;
                    const dept = emp?.department?.name || 'General';
                    const pausesCount = s.pauses ? s.pauses.length : (s.totalPausedSeconds > 0 ? 1 : 0);
                    const pausedMins = Math.round((s.totalPausedSeconds || 0) / 60);
                    const workHours = (s.totalWorkingSeconds / 3600).toFixed(1);

                    return (
                      <TableRow key={s.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {code}
                          </Typography>
                        </TableCell>
                        <TableCell>{dept}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{s.attendanceDate}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Chip label={pausesCount} size="small" variant="outlined" sx={{ fontWeight: 700, height: 22 }} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'warning.dark' }}>
                          {pausedMins} mins
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{workHours}h</TableCell>
                        <TableCell>
                          <Chip
                            label={s.status.replace(/_/g, ' ')}
                            color={s.status === 'PAUSED' ? 'warning' : 'default'}
                            size="small"
                            variant={s.status === 'PAUSED' ? 'filled' : 'outlined'}
                            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
              )}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredRows.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </TableContainer>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<FileDownloadIcon />}
          onClick={handleExport}
          disabled={filteredRows.length === 0}
          sx={{ fontWeight: 600 }}
        >
          Export CSV
        </Button>
        <Button variant="contained" onClick={onClose} sx={{ fontWeight: 600 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
