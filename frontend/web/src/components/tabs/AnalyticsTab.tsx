import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

export function AnalyticsTab() {
  const [timeRange, setTimeRange] = useState('7d');

  const exportAnalyticsReport = () => {
    const csvContent =
      'Date,Total Employees,Clocked In,On-Time Rate,Geofence Compliance,Exceptions\n' +
      '2026-09-29,48,46,95.8%,99.2%,2\n' +
      '2026-09-28,48,47,97.9%,98.5%,1\n' +
      '2026-09-27,48,45,93.7%,100%,3\n' +
      '2026-09-26,48,48,100%,99.5%,0\n' +
      '2026-09-25,48,46,95.8%,99.0%,1\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `workforce-analytics-${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const departmentsData = [
    { name: 'Engineering & AI', total: 18, present: 17, rate: 94.4, color: '#FF6B35' },
    { name: 'Operations & Logistics', total: 14, present: 14, rate: 100, color: '#0EA5E9' },
    { name: 'Sales & Field Services', total: 9, present: 8, rate: 88.9, color: '#F59E0B' },
    { name: 'Human Resources', total: 4, present: 4, rate: 100, color: '#10B981' },
    { name: 'Executive Leadership', total: 3, present: 3, rate: 100, color: '#8B5CF6' },
  ];

  return (
    <Box>
      {/* Header Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TrendingUpIcon sx={{ color: '#FF6B35', fontSize: 28 }} />
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
              Workforce Analytics & Intelligence
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Aggregate attendance trends, punctuality metrics, and geofence compliance telemetry.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Select
            size="small"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            sx={{ bgcolor: '#FFFFFF', borderRadius: 2, fontSize: 13, fontWeight: 600 }}
          >
            <MenuItem value="today">Today</MenuItem>
            <MenuItem value="7d">Last 7 Days</MenuItem>
            <MenuItem value="30d">Last 30 Days</MenuItem>
            <MenuItem value="quarter">This Quarter</MenuItem>
          </Select>

          <Button
            variant="contained"
            startIcon={<FileDownloadIcon />}
            onClick={exportAnalyticsReport}
            sx={{
              borderRadius: 2,
              fontWeight: 700,
              textTransform: 'none',
              background: 'linear-gradient(135deg, #FF6B35 0%, #FFA043 100%)',
            }}
          >
            Export CSV Report
          </Button>
        </Box>
      </Box>

      {/* KPI Cards Row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2.5, mb: 3.5 }}>
        <Card sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
              Overall Attendance Rate
            </Typography>
            <Chip label="+2.4% vs last week" size="small" sx={{ bgcolor: 'rgba(16, 185, 129, 0.12)', color: '#059669', fontWeight: 700, fontSize: 11 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
            96.8%
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B' }}>
            46 of 48 active staff clocked in
          </Typography>
          <LinearProgress variant="determinate" value={96.8} sx={{ mt: 1.5, height: 6, borderRadius: 3, bgcolor: '#E2E8F0', '& .MuiLinearProgress-bar': { bgcolor: '#10B981' } }} />
        </Card>

        <Card sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
              On-Time Punctuality
            </Typography>
            <AccessTimeIcon sx={{ color: '#FF6B35', fontSize: 20 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
            92.4%
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B' }}>
            Arrival prior to 09:15 AM threshold
          </Typography>
          <LinearProgress variant="determinate" value={92.4} sx={{ mt: 1.5, height: 6, borderRadius: 3, bgcolor: '#E2E8F0', '& .MuiLinearProgress-bar': { bgcolor: '#FF6B35' } }} />
        </Card>

        <Card sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
              Polygon Compliance
            </Typography>
            <LocationCityIcon sx={{ color: '#0EA5E9', fontSize: 20 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
            99.2%
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B' }}>
            Inside designated office coordinates
          </Typography>
          <LinearProgress variant="determinate" value={99.2} sx={{ mt: 1.5, height: 6, borderRadius: 3, bgcolor: '#E2E8F0', '& .MuiLinearProgress-bar': { bgcolor: '#0EA5E9' } }} />
        </Card>

        <Card sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
              Pending Exceptions
            </Typography>
            <WarningAmberIcon sx={{ color: '#F59E0B', fontSize: 20 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#D97706' }}>
            2
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B' }}>
            Requires HR/Admin authorization
          </Typography>
          <LinearProgress variant="determinate" value={20} sx={{ mt: 1.5, height: 6, borderRadius: 3, bgcolor: '#E2E8F0', '& .MuiLinearProgress-bar': { bgcolor: '#F59E0B' } }} />
        </Card>
      </Box>

      {/* Main Analytics Content */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
        {/* Department Breakdown */}
        <Card sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', mb: 1 }}>
            Department Attendance Distribution
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mb: 3 }}>
            Real-time participation rate by organizational unit.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {departmentsData.map((dept) => (
              <Box key={dept.name}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E293B' }}>
                    {dept.name}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: dept.color }}>
                    {dept.present}/{dept.total} ({dept.rate}%)
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={dept.rate}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: '#F1F5F9',
                    '& .MuiLinearProgress-bar': { bgcolor: dept.color, borderRadius: 4 },
                  }}
                />
              </Box>
            ))}
          </Box>
        </Card>

        {/* Weekly Attendance Heatmap / Visualizer */}
        <Card sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', mb: 1 }}>
            Weekly Attendance Consistency
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mb: 3 }}>
            Daily check-in volume across standard operational hours.
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1.5, mb: 3 }}>
            {[
              { day: 'Mon', date: 'Sep 25', rate: 96, count: 46 },
              { day: 'Tue', date: 'Sep 26', rate: 100, count: 48 },
              { day: 'Wed', date: 'Sep 27', rate: 94, count: 45 },
              { day: 'Thu', date: 'Sep 28', rate: 98, count: 47 },
              { day: 'Fri', date: 'Sep 29', rate: 96, count: 46 },
            ].map((col) => (
              <Box
                key={col.day}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: col.rate === 100 ? 'rgba(16, 185, 129, 0.08)' : '#F8FAFC',
                  border: '1px solid',
                  borderColor: col.rate === 100 ? 'rgba(16, 185, 129, 0.3)' : '#E2E8F0',
                  textAlign: 'center',
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B', display: 'block' }}>
                  {col.day}
                </Typography>
                <Typography variant="body2" sx={{ color: '#94A3B8', fontSize: 11, mb: 1 }}>
                  {col.date}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>
                  {col.count}
                </Typography>
                <Chip
                  label={`${col.rate}%`}
                  size="small"
                  sx={{
                    mt: 1,
                    fontSize: 11,
                    fontWeight: 700,
                    bgcolor: col.rate >= 98 ? '#DCFCE7' : '#F1F5F9',
                    color: col.rate >= 98 ? '#15803D' : '#475569',
                  }}
                />
              </Box>
            ))}
          </Box>

          {/* Key Insights Callout */}
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'rgba(255, 107, 53, 0.08)',
              border: '1px solid rgba(255, 107, 53, 0.2)',
              display: 'flex',
              gap: 1.5,
              alignItems: 'center',
            }}
          >
            <CheckCircleIcon sx={{ color: '#FF6B35', fontSize: 24 }} />
            <Typography variant="caption" sx={{ color: '#334155', lineHeight: 1.4 }}>
              <strong>AI Insight:</strong> Punctuality peak occurs on Tuesdays (100% on-time). Peak check-in traffic across all office polygons is recorded between <strong>08:45 AM – 08:58 AM</strong>.
            </Typography>
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
