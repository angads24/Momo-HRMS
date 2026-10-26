import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
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
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DateRangeIcon from '@mui/icons-material/DateRange';
import type { AttendanceSession } from '../types/attendance';
import type { Employee } from '../../../types/employee';
import { downloadCsv } from '../utils/csvExport';

interface MonthlyAttendanceReportProps {
  open: boolean;
  onClose: () => void;
  sessions: AttendanceSession[];
  employees?: Employee[];
}

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export function MonthlyAttendanceReport({
  open,
  onClose,
  sessions,
  employees = [],
}: MonthlyAttendanceReportProps) {
  const now = new Date();
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
  const currentYearStr = String(now.getFullYear());

  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState(currentYearStr);
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

  // Target prefix: YYYY-MM
  const monthPrefix = `${selectedYear}-${selectedMonth}`;

  // Filter sessions for this month
  const monthlySessions = useMemo(() => {
    return sessions.filter((s) => s.attendanceDate.startsWith(monthPrefix));
  }, [sessions, monthPrefix]);

  // Group by employee
  interface EmployeeMonthlySummary {
    employeeId: string;
    employeeName: string;
    employeeCode: string;
    department: string;
    daysPresent: number;
    onTimeDays: number;
    lateDays: number;
    totalSeconds: number;
    totalHours: number;
    avgDailyHours: number;
  }

  const employeeSummaries = useMemo(() => {
    const group = new Map<string, AttendanceSession[]>();
    for (const s of monthlySessions) {
      const list = group.get(s.employeeId) || [];
      list.push(s);
      group.set(s.employeeId, list);
    }

    const summaries: EmployeeMonthlySummary[] = [];

    // Include all employees who had sessions, or all known employees
    for (const [empId, empSessions] of group.entries()) {
      const emp = empMap.get(empId);
      const daysPresent = new Set(empSessions.map((s) => s.attendanceDate)).size;
      const onTimeDays = empSessions.filter(
        (s) => s.checkInStatus === 'ON_TIME' || s.checkInStatus === 'GRACE_PERIOD',
      ).length;
      const lateDays = empSessions.filter((s) => s.checkInStatus === 'LATE').length;
      const totalSeconds = empSessions.reduce((acc, s) => acc + (s.totalWorkingSeconds || 0), 0);
      const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;
      const avgDailyHours = daysPresent > 0 ? Math.round((totalHours / daysPresent) * 10) / 10 : 0;

      summaries.push({
        employeeId: empId,
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : empId,
        employeeCode: emp?.employeeCode || empId,
        department: emp?.department?.name || 'General',
        daysPresent,
        onTimeDays,
        lateDays,
        totalSeconds,
        totalHours,
        avgDailyHours,
      });
    }

    return summaries.sort((a, b) => b.totalHours - a.totalHours);
  }, [monthlySessions, empMap]);

  // Search filter
  const filteredSummaries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employeeSummaries;
    return employeeSummaries.filter(
      (e) =>
        e.employeeName.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q),
    );
  }, [employeeSummaries, search]);

  // Aggregate stats
  const totalEmployeesPresent = employeeSummaries.length;
  const totalMonthHours = employeeSummaries.reduce((acc, e) => acc + e.totalHours, 0).toFixed(1);
  const totalMonthLateDays = employeeSummaries.reduce((acc, e) => acc + e.lateDays, 0);

  const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label || selectedMonth;

  const handleExport = () => {
    const headers = [
      'Employee Code',
      'Employee Name',
      'Department',
      'Month/Year',
      'Days Present',
      'On-Time Days',
      'Late Days',
      'Total Working Hours',
      'Average Daily Hours',
    ];
    const rows = filteredSummaries.map((e) => [
      e.employeeCode,
      e.employeeName,
      e.department,
      `${monthLabel} ${selectedYear}`,
      e.daysPresent,
      e.onTimeDays,
      e.lateDays,
      e.totalHours,
      e.avgDailyHours,
    ]);
    downloadCsv(`monthly_attendance_${selectedYear}_${selectedMonth}`, headers, rows);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth slotProps={{ paper: { sx: { borderRadius: 2.5 } } }}>
      <DialogTitle sx={{ m: 0, p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(27, 75, 143, 0.08)', color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DateRangeIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Monthly Attendance Report
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Monthly overview with employee totals, punctuality, and hours
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Filter Controls */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Month</InputLabel>
              <Select value={selectedMonth} label="Month" onChange={(e) => setSelectedMonth(e.target.value)}>
                {MONTHS.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Year</InputLabel>
              <Select value={selectedYear} label="Year" onChange={(e) => setSelectedYear(e.target.value)}>
                {['2025', '2026', '2027'].map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              placeholder="Search staff, code, department..."
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: 260 }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={`Staff Active: ${totalEmployeesPresent}`} color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
            <Chip label={`Total Hours: ${totalMonthHours}h`} sx={{ fontWeight: 600, bgcolor: 'rgba(27, 75, 143, 0.08)', color: 'primary.main' }} />
            <Chip label={`Late Instances: ${totalMonthLateDays}`} color="warning" variant="outlined" sx={{ fontWeight: 600 }} />
          </Box>
        </Box>

        {/* Monthly Summary Table */}
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Days Present</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>On-Time Days</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Late Days</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Total Hours</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Avg Daily Hours</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSummaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                    No attendance records found for {monthLabel} {selectedYear}.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSummaries
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((e) => (
                    <TableRow key={e.employeeId} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {e.employeeName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {e.employeeCode}
                        </Typography>
                      </TableCell>
                      <TableCell>{e.department}</TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 600 }}>{e.daysPresent}</TableCell>
                      <TableCell sx={{ textAlign: 'center', color: 'success.main', fontWeight: 600 }}>
                        {e.onTimeDays}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        {e.lateDays > 0 ? (
                          <Chip label={e.lateDays} color="warning" size="small" sx={{ fontWeight: 700, height: 20 }} />
                        ) : (
                          0
                        )}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{e.totalHours}h</TableCell>
                      <TableCell>{e.avgDailyHours}h / day</TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredSummaries.length}
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
          disabled={filteredSummaries.length === 0}
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
