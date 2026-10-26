import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AlarmIcon from '@mui/icons-material/Alarm';
import BoltIcon from '@mui/icons-material/Bolt';
import type { AttendanceSession } from '../types/attendance';

interface ReportStatCardsProps {
  sessions: AttendanceSession[];
  loading?: boolean;
  totalActiveEmployees?: number;
}

export function ReportStatCards({
  sessions,
  loading = false,
  totalActiveEmployees = 1,
}: ReportStatCardsProps) {
  // Aggregate Metrics
  const totalSessions = sessions.length;
  const onTimeOrGraceCount = sessions.filter(
    (s) => s.checkInStatus === 'ON_TIME' || s.checkInStatus === 'GRACE_PERIOD',
  ).length;

  const lateArrivalsCount = sessions.filter((s) => s.checkInStatus === 'LATE').length;

  const autoCheckoutsCount = sessions.filter(
    (s) =>
      s.checkoutType === 'AUTO_CHECKOUT' ||
      s.checkoutReason === 'GEOFENCE_TIMEOUT' ||
      s.status === 'AUTO_CHECKED_OUT',
  ).length;

  const totalWorkingSeconds = sessions.reduce((acc, s) => acc + (s.totalWorkingSeconds || 0), 0);
  const totalWorkingHours = (totalWorkingSeconds / 3600).toLocaleString('en-US', {
    maximumFractionDigits: 1,
  });

  // Calculate distinct working days present in data
  const distinctDays = new Set(sessions.map((s) => s.attendanceDate)).size || 1;
  const maxPossibleSessions = Math.max(distinctDays * Math.max(totalActiveEmployees, 1), totalSessions);
  const avgAttendancePct =
    maxPossibleSessions > 0
      ? Math.min(100, Math.round((totalSessions / maxPossibleSessions) * 100))
      : 0;

  const statItems = [
    {
      title: 'This Month Avg Attendance',
      value: `${avgAttendancePct}%`,
      subtitle: `${onTimeOrGraceCount} on-time sessions recorded`,
      icon: <TrendingUpIcon fontSize="small" />,
      color: '#16A34A',
      bgColor: 'rgba(22, 163, 74, 0.08)',
      borderColor: 'rgba(22, 163, 74, 0.25)',
    },
    {
      title: 'Total Working Hours',
      value: `${totalWorkingHours}h`,
      subtitle: `${totalSessions} verified shift sessions`,
      icon: <AccessTimeIcon fontSize="small" />,
      color: '#1B4B8F',
      bgColor: 'rgba(27, 75, 143, 0.08)',
      borderColor: 'rgba(27, 75, 143, 0.25)',
    },
    {
      title: 'Late Arrivals',
      value: lateArrivalsCount.toLocaleString('en-US'),
      subtitle: totalSessions > 0 ? `${Math.round((lateArrivalsCount / totalSessions) * 100)}% of total arrivals` : '0% of total',
      icon: <AlarmIcon fontSize="small" />,
      color: '#D97706',
      bgColor: 'rgba(217, 119, 6, 0.08)',
      borderColor: 'rgba(217, 119, 6, 0.25)',
    },
    {
      title: 'Auto Checkouts',
      value: autoCheckoutsCount.toLocaleString('en-US'),
      subtitle: 'Triggered by geofence timeouts',
      icon: <BoltIcon fontSize="small" />,
      color: '#DC2626',
      bgColor: 'rgba(220, 38, 38, 0.08)',
      borderColor: 'rgba(220, 38, 38, 0.25)',
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 4,
      }}
    >
      {statItems.map((item, index) => (
        <Card
          key={index}
          variant="outlined"
          sx={{
            borderRadius: 2.5,
            borderColor: 'divider',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 6px 20px rgba(15, 23, 42, 0.06)',
            },
          }}
        >
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                {item.title}
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 34,
                  height: 34,
                  borderRadius: 2,
                  bgcolor: item.bgColor,
                  color: item.color,
                }}
              >
                {item.icon}
              </Box>
            </Box>

            {loading ? (
              <>
                <Skeleton variant="text" width="60%" height={44} />
                <Skeleton variant="text" width="80%" height={20} />
              </>
            ) : (
              <>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5, lineHeight: 1.2 }}>
                  {item.value}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                  {item.subtitle}
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
