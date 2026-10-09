import React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import PlayCircleOutlinedIcon from '@mui/icons-material/PlayCircleOutlined';
import PauseCircleOutlinedIcon from '@mui/icons-material/PauseCircleOutlined';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined';
import TimerOffOutlinedIcon from '@mui/icons-material/TimerOffOutlined';

export interface OverviewMetrics {
  totalEmployees: number;
  present: number;
  working: number;
  paused: number;
  checkedOut: number;
  absent: number;
  autoCheckout: number;
}

export type OverviewTabId =
  | 'total'
  | 'present'
  | 'working'
  | 'paused'
  | 'checked-out'
  | 'absent'
  | 'auto-checkout';

interface HrOverviewCardsProps {
  metrics: OverviewMetrics;
  loading?: boolean;
  selectedTab?: OverviewTabId;
  onSelectTab?: (tabId: OverviewTabId) => void;
}

export const HrOverviewCards: React.FC<HrOverviewCardsProps> = ({
  metrics,
  loading = false,
  selectedTab = 'total',
  onSelectTab,
}) => {
  const cards = [
    {
      id: 'total',
      label: 'Total Employees',
      value: metrics.totalEmployees,
      icon: <PeopleAltOutlinedIcon sx={{ fontSize: 20 }} />,
      color: '#2563eb',
      bgColor: '#eff6ff',
      borderColor: '#dbeafe',
    },
    {
      id: 'present',
      label: 'Present',
      value: metrics.present,
      icon: <CheckCircleOutlinedIcon sx={{ fontSize: 20 }} />,
      color: '#10b981',
      bgColor: '#ecfdf5',
      borderColor: '#d1fae5',
    },
    {
      id: 'working',
      label: 'Working',
      value: metrics.working,
      icon: <PlayCircleOutlinedIcon sx={{ fontSize: 20 }} />,
      color: '#059669',
      bgColor: '#ecfdf5',
      borderColor: '#a7f3d0',
    },
    {
      id: 'paused',
      label: 'Paused',
      value: metrics.paused,
      icon: <PauseCircleOutlinedIcon sx={{ fontSize: 20 }} />,
      color: '#d97706',
      bgColor: '#fffbeb',
      borderColor: '#fef3c7',
    },
    {
      id: 'checked-out',
      label: 'Checked Out',
      value: metrics.checkedOut,
      icon: <ExitToAppIcon sx={{ fontSize: 20 }} />,
      color: '#0284c7',
      bgColor: '#f0f9ff',
      borderColor: '#e0f2fe',
    },
    {
      id: 'absent',
      label: 'Absent',
      value: metrics.absent,
      icon: <PersonOffOutlinedIcon sx={{ fontSize: 20 }} />,
      color: '#e11d48',
      bgColor: '#fff1f2',
      borderColor: '#ffe4e6',
    },
    {
      id: 'auto-checkout',
      label: 'Auto Checkout',
      value: metrics.autoCheckout,
      icon: <TimerOffOutlinedIcon sx={{ fontSize: 20 }} />,
      color: '#7c3aed',
      bgColor: '#f5f3ff',
      borderColor: '#ede9fe',
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(3, 1fr)',
          md: 'repeat(4, 1fr)',
          lg: 'repeat(7, 1fr)',
        },
        gap: 2,
        mb: 3,
      }}
    >
      {cards.map((c) => {
        const isSelected = selectedTab === c.id;

        return (
          <Card
            key={c.id}
            variant="outlined"
            onClick={() => onSelectTab?.(c.id as OverviewTabId)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectTab?.(c.id as OverviewTabId);
              }
            }}
            sx={{
              p: 2,
              borderRadius: 2.5,
              cursor: 'pointer',
              borderColor: isSelected ? c.color : '#e2e8f0',
              borderWidth: isSelected ? 2 : 1,
              bgcolor: isSelected ? c.bgColor : '#ffffff',
              boxShadow: isSelected
                ? `0 6px 16px ${c.bgColor}, 0 2px 4px rgba(0,0,0,0.04)`
                : '0 1px 3px rgba(0,0,0,0.02)',
              transform: isSelected ? 'scale(1.02)' : 'none',
              transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              userSelect: 'none',
              outline: 'none',
              '&:hover': {
                boxShadow: `0 8px 20px rgba(0, 0, 0, 0.06)`,
                borderColor: c.color,
                transform: isSelected ? 'scale(1.02)' : 'translateY(-2px)',
              },
              '&:focus-visible': {
                outline: `2px solid ${c.color}`,
                outlineOffset: 2,
              },
            }}
          >
            {/* Active Top-Line Indicator */}
            {isSelected && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  bgcolor: c.color,
                  borderTopLeftRadius: 10,
                  borderTopRightRadius: 10,
                }}
              />
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.2 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: isSelected ? 800 : 700,
                  color: isSelected ? c.color : 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  fontSize: '0.68rem',
                }}
              >
                {c.label}
              </Typography>
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: 1.5,
                  bgcolor: isSelected ? '#ffffff' : c.bgColor,
                  color: c.color,
                  boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {c.icon}
              </Box>
            </Box>

            {loading ? (
              <Skeleton variant="text" width={48} height={40} />
            ) : (
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  color: isSelected ? c.color : 'text.primary',
                  lineHeight: 1.1,
                  fontSize: '1.75rem',
                  letterSpacing: '-0.02em',
                }}
              >
                {c.value}
              </Typography>
            )}
          </Card>
        );
      })}
    </Box>
  );
};
