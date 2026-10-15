import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DashboardLayout } from '../../../components/DashboardLayout';
import { fetchAttendanceHistory } from '../services/attendanceService';
import type { AttendanceSession } from '../types/attendance';
import { AttendanceFilters } from '../components/AttendanceFilters';
import { AttendanceTable } from '../components/AttendanceTable';

export default function AttendanceHistoryPage() {
  const navigate = useNavigate();

  const [allSessions, setAllSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state (client-side)
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Filter state (default: last 30 days)
  const [startDate, setStartDate] = useState(() =>
    new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(() =>
    new Date().toISOString().split('T')[0],
  );

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAttendanceHistory({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setAllSessions(res.items ?? []);
      setPage(1);
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Unable to load attendance history.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const total = allSessions.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return allSessions.slice(start, start + pageSize);
  }, [allSessions, currentPage, pageSize]);

  const handleResetFilters = () => {
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setStartDate(start);
    setEndDate(end);
  };

  const handleViewDetails = (session: AttendanceSession) => {
    navigate(`/attendance/${session.id}`);
  };

  return (
    <DashboardLayout
      title="Attendance Records"
      subtitle="View, filter, and audit attendance log history and working hours."
    >
      <Box sx={{ mb: 3 }}>
        <Button
          variant="text"
          color="inherit"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/attendance')}
          sx={{ mb: 2 }}
        >
          Back to Attendance Dashboard
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <AttendanceFilters
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onReset={handleResetFilters}
      />

      <AttendanceTable
        sessions={paginatedSessions}
        loading={loading}
        page={currentPage}
        totalPages={totalPages}
        total={total}
        onPageChange={(newPage) => setPage(newPage)}
        onViewDetails={handleViewDetails}
      />
    </DashboardLayout>
  );
}
