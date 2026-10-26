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
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import type { AttendanceSession } from '../types/attendance';
import type { Employee } from '../../../types/employee';
import { downloadCsv } from '../utils/csvExport';

interface DailyAttendanceReportProps {
  open: boolean;
  onClose: () => void;
  sessions: AttendanceSession[];
  employees?: Employee[];
}

export function DailyAttendanceReport({
  open,
  onClose,
  sessions,
  employees = [],
}: DailyAttendanceReportProps) {
  // Default to today or latest session date
  const latestDate = sessions[0]?.attendanceDate || new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(latestDate);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Map employee lookup
  const empMap = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const e of employees) {
      if (e.id) map.set(e.id, e);
      if (e.employeeCode) map.set(e.employeeCode, e);
    }
    return map;
  }, [employees]);

  // Filter sessions for the selected day
  const dailySessions = useMemo(() => {
    return sessions.filter((s) => s.attendanceDate === selectedDate);
  }, [sessions, selectedDate]);

  // Filtered by search query (employee name or code)
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return dailySessions;
    return dailySessions.filter((s) => {
      const emp = empMap.get(s.employeeId);
      const name = emp ? `${emp.firstName} ${emp.lastName}`.toLowerCase() : '';
      const code = (emp?.employeeCode || s.employeeId).toLowerCase();
      const dept = (emp?.department?.name || '').toLowerCase();
      return name.includes(q) || code.includes(q) || dept.includes(q);
    });
  }, [dailySessions, search, empMap]);

  // Summary Metrics
  const presentCount = dailySessions.length;
  const onTimeCount = dailySessions.filter(
    (s) => s.checkInStatus === 'ON_TIME' || s.checkInStatus === 'GRACE_PERIOD',
  ).length;
  const lateCount = dailySessions.filter((s) => s.checkInStatus === 'LATE').length;
  const totalSeconds = dailySessions.reduce((acc, s) => acc + (s.totalWorkingSeconds || 0), 0);
  const totalHours = (totalSeconds / 3600).toFixed(1);

  const handleExport = () => {
    const headers = [
      'Employee Code',
      'Employee Name',
      'Department',
      'Attendance Date',
      'Check-In Time',
      'Check-Out Time',
      'Working Hours',
      'Punctuality Status',
      'Checkout Type',
    ];
    const rows = filteredRows.map((s) => {
      const emp = empMap.get(s.employeeId);
      const name = emp ? `${emp.firstName} ${emp.lastName}` : 'N/A';
      const code = emp?.employeeCode || s.employeeId;
      const dept = emp?.department?.name || 'General';
      const checkInTime = s.checkInAt ? new Date(s.checkInAt).toLocaleTimeString() : 'N/A';
      const checkOutTime = s.checkOutAt ? new Date(s.checkOutAt).toLocaleTimeString() : 'In Progress';
      const hours = (s.totalWorkingSeconds / 3600).toFixed(2);
      return [code, name, dept, s.attendanceDate, checkInTime, checkOutTime, hours, s.checkInStatus, s.checkoutType || 'NORMAL'];
    });

    downloadCsv(`daily_attendance_${selectedDate}`, headers, rows);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth slotProps={{ paper: { sx: { borderRadius: 2.5 } } }}>
      <DialogTitle sx={{ m: 0, p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(27, 75, 143, 0.08)', color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarTodayIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Daily Attendance Report
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Present, late, and check-out logs for a specific day
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
              label="Select Date"
              type="date"
              size="small"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setPage(0);
              }}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ width: 180 }}
            />
            <TextField
              placeholder="Search employee name, code..."
              size="small"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              sx={{ width: 260 }}
            />
          </Box>

          {/* KPI Summary Chips */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={`Present: ${presentCount}`} color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
            <Chip label={`On-Time: ${onTimeCount}`} color="success" variant="outlined" sx={{ fontWeight: 600 }} />
            <Chip label={`Late: ${lateCount}`} color="warning" variant="outlined" sx={{ fontWeight: 600 }} />
            <Chip label={`Total Hours: ${totalHours}h`} sx={{ fontWeight: 600, bgcolor: 'rgba(27, 75, 143, 0.08)', color: 'primary.main' }} />
          </Box>
        </Box>

        {/* Attendance Table */}
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Check-In</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Check-Out</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Working Hours</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Punctuality</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                    No attendance records logged for {selectedDate}.
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
                    const checkInTime = s.checkInAt ? new Date(s.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
                    const checkOutTime = s.checkOutAt ? new Date(s.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Working';
                    const hours = (s.totalWorkingSeconds / 3600).toFixed(1);

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
                        <TableCell>{checkInTime}</TableCell>
                        <TableCell>{checkOutTime}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{hours}h</TableCell>
                        <TableCell>
                          <Chip
                            label={s.checkInStatus === 'ON_TIME' ? 'On Time' : s.checkInStatus === 'GRACE_PERIOD' ? 'Grace Period' : 'Late'}
                            color={s.checkInStatus === 'ON_TIME' ? 'success' : s.checkInStatus === 'GRACE_PERIOD' ? 'info' : 'warning'}
                            size="small"
                            variant="filled"
                            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={s.status.replace(/_/g, ' ')}
                            size="small"
                            variant="outlined"
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
