import Box from '@mui/material/Box';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DateRangeIcon from '@mui/icons-material/DateRange';
import PersonIcon from '@mui/icons-material/Person';
import AlarmIcon from '@mui/icons-material/Alarm';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import LocationOffIcon from '@mui/icons-material/LocationOff';
import BoltIcon from '@mui/icons-material/Bolt';
import ApartmentIcon from '@mui/icons-material/Apartment';
import { ReportCard } from './ReportCard';

export interface ReportDefinition {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export const REPORT_TYPES: ReportDefinition[] = [
  {
    id: 'daily',
    icon: <CalendarTodayIcon />,
    title: 'Daily Attendance Report',
    description: 'Present/absent/late summary for a specific date',
  },
  {
    id: 'monthly',
    icon: <DateRangeIcon />,
    title: 'Monthly Attendance Report',
    description: 'Monthly overview with trends and summaries',
  },
  {
    id: 'employee',
    icon: <PersonIcon />,
    title: 'Employee Attendance Report',
    description: 'Individual employee attendance history',
  },
  {
    id: 'late-arrival',
    icon: <AlarmIcon />,
    title: 'Late Arrival Report',
    description: 'Employees who arrived after the grace period',
  },
  {
    id: 'early-checkout',
    icon: <DirectionsRunIcon />,
    title: 'Early Checkout Report',
    description: 'Employees who left before scheduled end time',
  },
  {
    id: 'paused-time',
    icon: <PauseCircleIcon />,
    title: 'Paused Time Report',
    description: 'Time spent outside allowed locations',
  },
  {
    id: 'geofence-violation',
    icon: <LocationOffIcon />,
    title: 'Geofence Violation Report',
    description: 'Location boundary breaches and durations',
  },
  {
    id: 'auto-checkout',
    icon: <BoltIcon />,
    title: 'Auto Checkout Report',
    description: 'Automatic checkouts due to location violations',
  },
  {
    id: 'location-activity',
    icon: <ApartmentIcon />,
    title: 'Location Activity Report',
    description: 'Activity summary by office location',
  },
];

interface ReportTypeGridProps {
  onSelect: (reportId: string) => void;
  activeReport?: string | null;
}

export function ReportTypeGrid({ onSelect, activeReport }: ReportTypeGridProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
        gap: 3,
      }}
    >
      {REPORT_TYPES.map((report) => (
        <ReportCard
          key={report.id}
          id={report.id}
          icon={report.icon}
          title={report.title}
          description={report.description}
          onGenerate={() => onSelect(report.id)}
          active={activeReport === report.id}
        />
      ))}
    </Box>
  );
}
