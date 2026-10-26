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
import ApartmentIcon from '@mui/icons-material/Apartment';
import type { AttendanceSession } from '../types/attendance';
import type { Employee } from '../../../types/employee';
import type { Office } from '../../geofence/types/geofence';
import { downloadCsv } from '../utils/csvExport';

interface LocationActivityReportProps {
  open: boolean;
  onClose: () => void;
  sessions: AttendanceSession[];
  employees?: Employee[];
  offices?: Office[];
}

export function LocationActivityReport({
  open,
  onClose,
  sessions,
  employees = [],
  offices = [],
}: LocationActivityReportProps) {
  const dates = sessions.map((s) => s.attendanceDate).sort();
  const defaultStart = dates[0] || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const defaultEnd = dates[dates.length - 1] || new Date().toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('ALL');
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

  // Office lookup map
  const officeMap = useMemo(() => {
    const map = new Map<string, Office>();
    for (const o of offices) {
      if (o.id) map.set(o.id, o);
      if (o.code) map.set(o.code, o);
    }
    return map;
  }, [offices]);

  // Filter sessions by date range
  const rangeSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (startDate && s.attendanceDate < startDate) return false;
      if (endDate && s.attendanceDate > endDate) return false;
      return true;
    });
  }, [sessions, startDate, endDate]);

  // Group by office
  interface OfficeSummary {
    officeId: string;
    officeName: string;
    officeCode: string;
    activeStaffCount: number;
    totalSessions: number;
    onTimeCount: number;
    lateCount: number;
    autoCheckoutCount: number;
    totalSeconds: number;
    totalHours: number;
    avgShiftHours: number;
    onTimeRate: number;
  }

  const officeSummaries = useMemo(() => {
    // Map: officeKey -> list of sessions
    const groups = new Map<string, { sessions: AttendanceSession[]; employees: Set<string> }>();

    for (const s of rangeSessions) {
      const emp = empMap.get(s.employeeId);
      // Determine office
      const officeKey =
        emp?.officeLocationId ||
        emp?.assignedOffice?.code ||
        emp?.assignedOffice?.id ||
        (emp?.assignedOffices?.[0]?.code) ||
        'UNASSIGNED';

      const entry = groups.get(officeKey) || { sessions: [], employees: new Set<string>() };
      entry.sessions.push(s);
      entry.employees.add(s.employeeId);
      groups.set(officeKey, entry);
    }

    const list: OfficeSummary[] = [];

    // Ensure all registered offices appear in report
    const processedKeys = new Set<string>();
    for (const off of offices) {
      const key = off.code || off.id;
      processedKeys.add(key);
      const entry = groups.get(key) || groups.get(off.id) || groups.get(off.code) || { sessions: [], employees: new Set() };
      const sessList = entry.sessions;
      const totalSess = sessList.length;
      const onTime = sessList.filter((s) => s.checkInStatus === 'ON_TIME' || s.checkInStatus === 'GRACE_PERIOD').length;
      const late = sessList.filter((s) => s.checkInStatus === 'LATE').length;
      const autoOut = sessList.filter(
        (s) => s.checkoutType === 'AUTO_CHECKOUT' || s.checkoutReason === 'GEOFENCE_TIMEOUT' || s.status === 'AUTO_CHECKED_OUT',
      ).length;
      const totalSec = sessList.reduce((acc, s) => acc + (s.totalWorkingSeconds || 0), 0);
      const totalHours = Math.round((totalSec / 3600) * 10) / 10;
      const avgShift = totalSess > 0 ? Math.round((totalHours / totalSess) * 10) / 10 : 0;
      const rate = totalSess > 0 ? Math.round((onTime / totalSess) * 100) : 100;

      list.push({
        officeId: off.id,
        officeName: off.name,
        officeCode: off.code || off.id,
        activeStaffCount: entry.employees.size,
        totalSessions: totalSess,
        onTimeCount: onTime,
        lateCount: late,
        autoCheckoutCount: autoOut,
        totalSeconds: totalSec,
        totalHours,
        avgShiftHours: avgShift,
        onTimeRate: rate,
      });
    }

    // Include UNASSIGNED or extra offices
    for (const [key, entry] of groups.entries()) {
      if (!processedKeys.has(key)) {
        const off = officeMap.get(key);
        const name = off?.name || (key === 'UNASSIGNED' ? 'General / Remote' : key);
        const sessList = entry.sessions;
        const totalSess = sessList.length;
        const onTime = sessList.filter((s) => s.checkInStatus === 'ON_TIME' || s.checkInStatus === 'GRACE_PERIOD').length;
        const late = sessList.filter((s) => s.checkInStatus === 'LATE').length;
        const autoOut = sessList.filter(
          (s) => s.checkoutType === 'AUTO_CHECKOUT' || s.checkoutReason === 'GEOFENCE_TIMEOUT',
        ).length;
        const totalSec = sessList.reduce((acc, s) => acc + (s.totalWorkingSeconds || 0), 0);
        const totalHours = Math.round((totalSec / 3600) * 10) / 10;
        const avgShift = totalSess > 0 ? Math.round((totalHours / totalSess) * 10) / 10 : 0;
        const rate = totalSess > 0 ? Math.round((onTime / totalSess) * 100) : 100;

        list.push({
          officeId: key,
          officeName: name,
          officeCode: off?.code || key,
          activeStaffCount: entry.employees.size,
          totalSessions: totalSess,
          onTimeCount: onTime,
          lateCount: late,
          autoCheckoutCount: autoOut,
          totalSeconds: totalSec,
          totalHours,
          avgShiftHours: avgShift,
          onTimeRate: rate,
        });
      }
    }

    return list.sort((a, b) => b.totalSessions - a.totalSessions);
  }, [rangeSessions, offices, officeMap, empMap]);

  const filteredSummaries = useMemo(() => {
    if (selectedOfficeId === 'ALL') return officeSummaries;
    return officeSummaries.filter(
      (o) => o.officeId === selectedOfficeId || o.officeCode === selectedOfficeId,
    );
  }, [officeSummaries, selectedOfficeId]);

  const totalOfficeSessions = filteredSummaries.reduce((acc, o) => acc + o.totalSessions, 0);
  const totalOfficeHours = filteredSummaries.reduce((acc, o) => acc + o.totalHours, 0).toFixed(1);

  const handleExport = () => {
    const headers = [
      'Office Code',
      'Office Name',
      'Date Range',
      'Active Staff Count',
      'Total Shift Sessions',
      'On-Time Sessions',
      'Late Sessions',
      'Auto-Checkouts',
      'Total Working Hours',
      'Average Shift Hours',
      'Punctuality Rate %',
    ];
    const rows = filteredSummaries.map((o) => [
      o.officeCode,
      o.officeName,
      `${startDate} to ${endDate}`,
      o.activeStaffCount,
      o.totalSessions,
      o.onTimeCount,
      o.lateCount,
      o.autoCheckoutCount,
      o.totalHours,
      o.avgShiftHours,
      `${o.onTimeRate}%`,
    ]);
    downloadCsv(`location_activity_report_${startDate}_to_${endDate}`, headers, rows);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth slotProps={{ paper: { sx: { borderRadius: 2.5 } } }}>
      <DialogTitle sx={{ m: 0, p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(27, 75, 143, 0.08)', color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ApartmentIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Location Activity Report
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Attendance, punctuality rate, and working shift performance by office geofence
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Controls */}
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
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Office Location</InputLabel>
              <Select value={selectedOfficeId} label="Office Location" onChange={(e) => setSelectedOfficeId(e.target.value)}>
                <MenuItem value="ALL">All Offices</MenuItem>
                {offices.map((off) => (
                  <MenuItem key={off.id} value={off.code || off.id}>
                    {off.name} ({off.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={`Sessions: ${totalOfficeSessions}`} color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
            <Chip label={`Total Hours: ${totalOfficeHours}h`} sx={{ fontWeight: 600, bgcolor: 'rgba(27, 75, 143, 0.08)', color: 'primary.main' }} />
          </Box>
        </Box>

        {/* Table */}
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Office Workplace</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Active Staff</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Sessions</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Punctuality Rate</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Total Hours</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Avg Shift</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Auto-Checkouts</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSummaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                    No office location records found for this period.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSummaries
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((o) => (
                    <TableRow key={o.officeId} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          📍 {o.officeName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {o.officeCode}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 600 }}>{o.activeStaffCount}</TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 600 }}>{o.totalSessions}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Chip
                          label={`${o.onTimeRate}%`}
                          color={o.onTimeRate >= 90 ? 'success' : o.onTimeRate >= 75 ? 'info' : 'warning'}
                          size="small"
                          sx={{ fontWeight: 700, height: 22 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{o.totalHours}h</TableCell>
                      <TableCell>{o.avgShiftHours}h</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        {o.autoCheckoutCount > 0 ? (
                          <Chip label={o.autoCheckoutCount} color="error" size="small" variant="filled" sx={{ fontWeight: 700, height: 20 }} />
                        ) : (
                          0
                        )}
                      </TableCell>
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
