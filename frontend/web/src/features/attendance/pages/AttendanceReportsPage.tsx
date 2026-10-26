import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssessmentIcon from '@mui/icons-material/Assessment';

import { DashboardLayout } from '../../../components/DashboardLayout';
import { fetchCompanyAttendanceHistory } from '../services/attendanceService';
import { fetchEmployees } from '../../../services/employeeService';
import { fetchOffices } from '../../geofence/services/geofenceService';
import type { AttendanceSession } from '../types/attendance';
import type { Employee } from '../../../types/employee';
import type { Office } from '../../geofence/types/geofence';

// Components
import { ReportStatCards } from '../components/ReportStatCards';
import { ReportTypeGrid } from '../components/ReportTypeGrid';

// Report Dialogs
import { DailyAttendanceReport } from '../components/DailyAttendanceReport';
import { MonthlyAttendanceReport } from '../components/MonthlyAttendanceReport';
import { EmployeeReportSelector } from '../components/EmployeeReportSelector';
import { LateArrivalReport } from '../components/LateArrivalReport';
import { EarlyCheckoutReport } from '../components/EarlyCheckoutReport';
import { PausedTimeReport } from '../components/PausedTimeReport';
import { GeofenceViolationReport } from '../components/GeofenceViolationReport';
import { AutoCheckoutReport } from '../components/AutoCheckoutReport';
import { LocationActivityReport } from '../components/LocationActivityReport';

function getThisMonthDateRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const start = `${year}-${month}-01`;
  const end = now.toISOString().split('T')[0];
  return { start, end };
}

export default function AttendanceReportsPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState(getThisMonthDateRange);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);

  // Active dialog state: 'daily' | 'monthly' | 'employee' | 'late-arrival' | ... | null
  const [activeReport, setActiveReport] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [historyRes, empRes, officeRes] = await Promise.allSettled([
        fetchCompanyAttendanceHistory({
          startDate: dateRange.start,
          endDate: dateRange.end,
        }),
        fetchEmployees({ all: true }),
        fetchOffices(),
      ]);

      if (historyRes.status === 'fulfilled') {
        setSessions(historyRes.value.items ?? []);
      } else {
        const err = historyRes.reason;
        const msg =
          axios.isAxiosError(err) && err.response?.data?.message
            ? String(err.response.data.message)
            : 'Failed to load attendance records.';
        setError(msg);
      }

      if (empRes.status === 'fulfilled') {
        const empData = empRes.value.data ?? [];
        setEmployees(empData);
      }

      if (officeRes.status === 'fulfilled') {
        setOffices(officeRes.value ?? []);
      }
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : 'An unexpected error occurred while loading reports data.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [dateRange.start, dateRange.end]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCloseDialog = () => {
    setActiveReport(null);
  };

  return (
    <DashboardLayout
      title="Reports"
      subtitle="Generate and export attendance reports"
    >
      {/* Top action bar */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Button
          variant="text"
          color="inherit"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/attendance')}
          sx={{ fontWeight: 600 }}
        >
          Back to Attendance
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField
            label="From"
            type="date"
            size="small"
            value={dateRange.start}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, start: e.target.value }))
            }
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 155 }}
          />
          <TextField
            label="To"
            type="date"
            size="small"
            value={dateRange.end}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, end: e.target.value }))
            }
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 155 }}
          />
          <Button
            variant="outlined"
            size="medium"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            disabled={loading}
            sx={{ borderRadius: 2 }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 4 KPI Stat Tiles */}
      <ReportStatCards
        sessions={sessions}
        loading={loading}
        totalActiveEmployees={employees.length || 1}
      />

      {/* Report Types Section Header */}
      <Box sx={{ mt: 5, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <AssessmentIcon sx={{ color: 'primary.main', fontSize: 26 }} />
          <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
            Report Types
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Choose a report module below to filter, analyze, and export specialized attendance CSV records.
        </Typography>
      </Box>

      {/* 3×3 Report Cards Grid */}
      <ReportTypeGrid
        onSelect={(reportId) => setActiveReport(reportId)}
        activeReport={activeReport}
      />

      {/* Interactive Report Dialogs */}
      <DailyAttendanceReport
        open={activeReport === 'daily'}
        onClose={handleCloseDialog}
        sessions={sessions}
        employees={employees}
      />

      <MonthlyAttendanceReport
        open={activeReport === 'monthly'}
        onClose={handleCloseDialog}
        sessions={sessions}
        employees={employees}
      />

      <EmployeeReportSelector
        open={activeReport === 'employee'}
        onClose={handleCloseDialog}
        employees={employees}
      />

      <LateArrivalReport
        open={activeReport === 'late-arrival'}
        onClose={handleCloseDialog}
        sessions={sessions}
        employees={employees}
      />

      <EarlyCheckoutReport
        open={activeReport === 'early-checkout'}
        onClose={handleCloseDialog}
        sessions={sessions}
        employees={employees}
      />

      <PausedTimeReport
        open={activeReport === 'paused-time'}
        onClose={handleCloseDialog}
        sessions={sessions}
        employees={employees}
      />

      <GeofenceViolationReport
        open={activeReport === 'geofence-violation'}
        onClose={handleCloseDialog}
        sessions={sessions}
        employees={employees}
      />

      <AutoCheckoutReport
        open={activeReport === 'auto-checkout'}
        onClose={handleCloseDialog}
        sessions={sessions}
        employees={employees}
      />

      <LocationActivityReport
        open={activeReport === 'location-activity'}
        onClose={handleCloseDialog}
        sessions={sessions}
        employees={employees}
        offices={offices}
      />
    </DashboardLayout>
  );
}
