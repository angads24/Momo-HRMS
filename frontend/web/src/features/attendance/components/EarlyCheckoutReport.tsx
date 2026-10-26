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
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import type { AttendanceSession } from '../types/attendance';
import type { Employee } from '../../../types/employee';
import { downloadCsv } from '../utils/csvExport';

interface EarlyCheckoutReportProps {
  open: boolean;
  onClose: () => void;
  sessions: AttendanceSession[];
  employees?: Employee[];
}

export function EarlyCheckoutReport({
  open,
  onClose,
  sessions,
  employees = [],
}: EarlyCheckoutReportProps) {
  const dates = sessions.map((s) => s.attendanceDate).sort();
  const defaultStart = dates[0] || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const defaultEnd = dates[dates.length - 1] || new Date().toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [expectedHours, setExpectedHours] = useState(8);
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

  const thresholdSeconds = expectedHours * 3600;

  // Filter completed or checked out sessions with total working hours below expected threshold
  const earlySessions = useMemo(() => {
    return sessions.filter((s) => {
      // Must have checked out (either normally or via manual)
      if (!s.checkOutAt && s.status === 'WORKING') return false;
      if (s.totalWorkingSeconds >= thresholdSeconds) return false;
      if (startDate && s.attendanceDate < startDate) return false;
      if (endDate && s.attendanceDate > endDate) return false;
      return true;
    });
  }, [sessions, thresholdSeconds, startDate, endDate]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return earlySessions;
    return earlySessions.filter((s) => {
      const emp = empMap.get(s.employeeId);
      const name = emp ? `${emp.firstName} ${emp.lastName}`.toLowerCase() : '';
      const code = (emp?.employeeCode || s.employeeId).toLowerCase();
      const dept = (emp?.department?.name || '').toLowerCase();
      return name.includes(q) || code.includes(q) || dept.includes(q);
    });
  }, [earlySessions, search, empMap]);

  const totalEarly = filteredRows.length;
  const distinctEmployees = new Set(filteredRows.map((s) => s.employeeId)).size;

  const handleExport = () => {
    const headers = [
      'Employee Code',
      'Employee Name',
      'Department',
      'Attendance Date',
      'Check-In Time',
      'Check-Out Time',
      'Actual Working Hours',
      'Expected Shift Hours',
      'Shortfall Hours',
    ];
    const rows = filteredRows.map((s) => {
      const emp = empMap.get(s.employeeId);
      const name = emp ? `${emp.firstName} ${emp.lastName}` : 'N/A';
      const code = emp?.employeeCode || s.employeeId;
      const dept = emp?.department?.name || 'General';
      const checkInTime = s.checkInAt ? new Date(s.checkInAt).toLocaleTimeString() : 'N/A';
      const checkOutTime = s.checkOutAt ? new Date(s.checkOutAt).toLocaleTimeString() : 'N/A';
      const actualHours = (s.totalWorkingSeconds / 3600).toFixed(2);
      const shortfall = Math.max(0, expectedHours - s.totalWorkingSeconds / 3600).toFixed(2);
      return [code, name, dept, s.attendanceDate, checkInTime, checkOutTime, actualHours, expectedHours, shortfall];
    });
    downloadCsv(`early_checkout_report_${startDate}_to_${endDate}`, headers, rows);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth slotProps={{ paper: { sx: { borderRadius: 2.5 } } }}>
      <DialogTitle sx={{ m: 0, p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(217, 119, 6, 0.08)', color: 'warning.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DirectionsRunIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Early Checkout Report
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Employees who checked out before completing scheduled working shift hours
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
            <TextField
              label="From Date"
              type="date"
              size="small"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ width: 150 }}
            />
            <TextField
              label="To Date"
              type="date"
              size="small"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ width: 150 }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Target Shift</InputLabel>
              <Select value={expectedHours} label="Target Shift" onChange={(e) => setExpectedHours(Number(e.target.value))}>
                <MenuItem value={6}>6.0 Hours</MenuItem>
                <MenuItem value={7}>7.0 Hours</MenuItem>
                <MenuItem value={8}>8.0 Hours (Standard)</MenuItem>
                <MenuItem value={9}>9.0 Hours</MenuItem>
              </Select>
            </FormControl>
            <TextField
              placeholder="Search staff, code..."
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: 220 }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={`Early Checkouts: ${totalEarly}`} color="warning" variant="outlined" sx={{ fontWeight: 700 }} />
            <Chip label={`Affected Employees: ${distinctEmployees}`} variant="outlined" sx={{ fontWeight: 600 }} />
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
                <TableCell sx={{ fontWeight: 700 }}>Check-In</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Check-Out</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actual Hours</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Shortfall</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                    No early checkout instances logged under {expectedHours}h for this range.
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
                    const checkOutTime = s.checkOutAt ? new Date(s.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Incomplete';
                    const actualHours = (s.totalWorkingSeconds / 3600).toFixed(1);
                    const shortfallHours = Math.max(0, expectedHours - s.totalWorkingSeconds / 3600).toFixed(1);

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
                        <TableCell>{checkInTime}</TableCell>
                        <TableCell sx={{ color: 'warning.dark', fontWeight: 600 }}>{checkOutTime}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{actualHours}h</TableCell>
                        <TableCell>
                          <Chip label={`-${shortfallHours}h`} color="error" size="small" variant="filled" sx={{ fontWeight: 700, fontSize: '0.75rem' }} />
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
