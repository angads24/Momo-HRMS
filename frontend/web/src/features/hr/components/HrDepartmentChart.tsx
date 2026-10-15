import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import type { Department, Employee } from '../../../types/employee';
import type { AttendanceSession } from '../../attendance/types/attendance';

export interface DepartmentStat {
  id: string;
  name: string;
  code: string;
  total: number;
  present: number;
  absent: number;
}

export type TimeframeOption = 'today' | 'week' | 'month' | 'year';

interface HrDepartmentChartProps {
  data: DepartmentStat[];
  departments?: Department[];
  employees?: Employee[];
  allSessions?: AttendanceSession[];
  loading?: boolean;
}

// Format date range string for the top-right corner based on selected timeframe
function getDateRangeLabel(timeframe: TimeframeOption): string {
  const now = new Date();
  const formatShort = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  switch (timeframe) {
    case 'today':
      return formatShort(now);
    case 'week': {
      const pastWeek = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      const startMonth = pastWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${startMonth} – ${formatShort(now)}`;
    }
    case 'month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return `${startOfMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${formatShort(endOfMonth)}`;
    }
    case 'year': {
      return `Jan 1 – Dec 31, ${now.getFullYear()}`;
    }
  }
}

// Clean formatting for department labels to avoid overflow/clipping
function formatDepartmentLabel(name: string, code?: string): { short: string; full: string } {
  const full = name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  if (code && code.trim().length <= 6) {
    return { short: code.trim().toUpperCase(), full };
  }

  const lower = name.toLowerCase().replace(/_/g, ' ');
  if (lower.includes('quality') || lower.includes('qa')) return { short: 'QA', full };
  if (lower.includes('engineer')) return { short: 'ENG', full };
  if (lower.includes('human') || lower === 'hr') return { short: 'HR', full };
  if (lower.includes('sales')) return { short: 'SALES', full };
  if (lower.includes('market')) return { short: 'MKTG', full };
  if (lower.includes('finance')) return { short: 'FIN', full };
  if (lower.includes('design')) return { short: 'DES', full };
  if (lower.includes('product')) return { short: 'PROD', full };
  if (lower.includes('operat')) return { short: 'OPS', full };

  if (name.includes('_') || name.includes(' ')) {
    const initials = name
      .split(/[\s_]+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
    if (initials.length >= 2 && initials.length <= 4) {
      return { short: initials, full };
    }
  }

  return { short: name.slice(0, 5).toUpperCase(), full };
}

export const HrDepartmentChart: React.FC<HrDepartmentChartProps> = ({
  data,
  departments: _departments = [],
  employees = [],
  allSessions = [],
  loading = false,
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('today');
  const [hoveredBar, setHoveredBar] = useState<{
    deptId: string;
    type: 'present' | 'absent';
    name: string;
    value: number;
    total: number;
    x: number;
    y: number;
  } | null>(null);

  const dateRangeLabel = useMemo(() => getDateRangeLabel(timeframe), [timeframe]);

  // Compute department stats dynamically for the selected timeframe
  const displayData: DepartmentStat[] = useMemo(() => {
    if (timeframe === 'today' || !allSessions || allSessions.length === 0) {
      return data;
    }

    const now = new Date();
    let startDate: Date;

    if (timeframe === 'week') {
      startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    } else if (timeframe === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const startIso = startDate.toISOString().split('T')[0];

    // Filter sessions matching timeframe
    const timeframeSessions = allSessions.filter((s) => {
      const sDate = s.attendanceDate || s.checkInAt?.split('T')[0] || '';
      return sDate >= startIso;
    });

    // Compute stats per department
    return data.map((dept) => {
      // Find employees of this department
      const deptEmployees = employees.filter(
        (e) =>
          (e as any).departmentId === dept.id ||
          e.department?.id === dept.id ||
          e.department?.name?.toLowerCase() === dept.name.toLowerCase() ||
          e.department?.code?.toLowerCase() === dept.code.toLowerCase(),
      );

      const deptEmpIds = new Set(deptEmployees.flatMap((e) => [e.id, e.employeeCode]).filter(Boolean));

      const deptSessions = timeframeSessions.filter((s) => deptEmpIds.has(s.employeeId));

      let presentCount = deptSessions.length;
      let absentCount = 0;

      if (timeframe === 'week') {
        const expectedWorkdays = Math.max(1, dept.total * 5);
        presentCount = Math.max(presentCount, dept.present * 5);
        absentCount = Math.max(0, expectedWorkdays - presentCount);
      } else if (timeframe === 'month') {
        const expectedWorkdays = Math.max(1, dept.total * 22);
        presentCount = Math.max(presentCount, dept.present * 22);
        absentCount = Math.max(0, expectedWorkdays - presentCount);
      } else if (timeframe === 'year') {
        const expectedWorkdays = Math.max(1, dept.total * 250);
        presentCount = Math.max(presentCount, dept.present * 250);
        absentCount = Math.max(0, expectedWorkdays - presentCount);
      } else {
        absentCount = Math.max(0, dept.total - presentCount);
      }

      return {
        ...dept,
        present: presentCount,
        absent: absentCount,
      };
    });
  }, [data, timeframe, allSessions, employees]);

  if (loading) {
    return (
      <Card
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          bgcolor: '#ffffff',
          border: '1px solid #e2e8f0',
          height: '100%',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Skeleton variant="text" width={180} height={32} />
          <Skeleton variant="rectangular" width={120} height={28} sx={{ borderRadius: 1.5 }} />
        </Box>
        <Skeleton variant="rectangular" width="100%" height={220} sx={{ borderRadius: 2 }} />
      </Card>
    );
  }

  // Calculate highest count for Y axis scale
  const maxDeptCount = Math.max(
    ...displayData.map((d) => Math.max(d.present, d.absent, 1)),
    5,
  );
  const yMax = Math.ceil(maxDeptCount / 5) * 5;
  const yTicks = [yMax, Math.round(yMax * 0.75), Math.round(yMax * 0.5), Math.round(yMax * 0.25), 0];

  // SVG Chart Geometry
  const svgWidth = 540;
  const svgHeight = 220;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 26;
  const padBottom = 38;
  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  const deptCount = Math.max(displayData.length, 1);
  const slotWidth = chartWidth / deptCount;
  const barWidth = Math.min(22, Math.max(12, slotWidth * 0.28));
  const barGap = 4;

  return (
    <Card
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        bgcolor: '#ffffff',
        border: '1px solid #e2e8f0',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      {/* Top Header: Title + Corner Dates Badge */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, gap: 1.5 }}>
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              color: '#0f172a',
              fontSize: '1.05rem',
              lineHeight: 1.25,
            }}
          >
            By Department
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: '#64748b',
              fontSize: '0.8125rem',
              mt: 0.5,
            }}
          >
            Workforce presence breakdown by team
          </Typography>
        </Box>

        {/* Date in the Corner */}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.8,
            bgcolor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 2,
            px: 1.25,
            py: 0.5,
            flexShrink: 0,
          }}
        >
          <CalendarTodayIcon sx={{ fontSize: 13, color: '#2563eb' }} />
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#334155',
              whiteSpace: 'nowrap',
            }}
          >
            {dateRangeLabel}
          </Typography>
        </Box>
      </Box>

      {/* Timeframe Selector Pills Row */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }} role="tablist" aria-label="Select timeframe">
        <Box
          sx={{
            display: 'inline-flex',
            bgcolor: '#f1f5f9',
            borderRadius: 2,
            p: '3px',
            gap: '2px',
          }}
        >
          {(['today', 'week', 'month', 'year'] as TimeframeOption[]).map((opt) => {
            const isActive = timeframe === opt;
            const labels: Record<TimeframeOption, string> = {
              today: 'Today',
              week: 'Week',
              month: 'Month',
              year: 'Year',
            };

            return (
              <Box
                key={opt}
                component="button"
                type="button"
                role="tab"
                aria-selected={isActive}
                tabIndex={0}
                onClick={() => setTimeframe(opt)}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setTimeframe(opt);
                  }
                }}
                sx={{
                  border: 'none',
                  bgcolor: isActive ? '#2563eb' : 'transparent',
                  color: isActive ? '#ffffff' : '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: isActive ? 700 : 600,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1.5,
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 1px 3px rgba(37,99,235,0.3)' : 'none',
                  transition: 'all 0.15s ease',
                  textTransform: 'capitalize',
                  '&:hover': {
                    color: isActive ? '#ffffff' : '#0f172a',
                  },
                  '&:focus-visible': {
                    outline: '2px solid #2563eb',
                    outlineOffset: 2,
                  },
                }}
              >
                {labels[opt]}
              </Box>
            );
          })}
        </Box>

        <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 500 }}>
          {displayData.length} Teams
        </Typography>
      </Box>

      {/* Main Vertical Bar Chart */}
      {displayData.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No department data available.
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: 220,
            userSelect: 'none',
            my: 'auto',
          }}
          onMouseLeave={() => setHoveredBar(null)}
        >
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            style={{ overflow: 'visible' }}
          >
            {/* Horizontal Gridlines & Y-Axis Labels */}
            {yTicks.map((tickVal, idx) => {
              const yPos = padTop + (idx / (yTicks.length - 1)) * chartHeight;
              return (
                <g key={`ytick-${tickVal}-${idx}`}>
                  <line
                    x1={padLeft}
                    y1={yPos}
                    x2={svgWidth - padRight}
                    y2={yPos}
                    stroke="#f1f5f9"
                    strokeDasharray={idx === yTicks.length - 1 ? 'none' : '4 4'}
                    strokeWidth={idx === yTicks.length - 1 ? '1.5' : '1'}
                  />
                  <text
                    x={padLeft - 8}
                    y={yPos + 4}
                    textAnchor="end"
                    fill="#94a3b8"
                    fontSize="10"
                    fontWeight="600"
                    fontFamily="monospace"
                  >
                    {tickVal}
                  </text>
                </g>
              );
            })}

            {/* Department Bar Groups */}
            {displayData.map((dept, idx) => {
              const { short, full } = formatDepartmentLabel(dept.name, dept.code);
              const slotCenter = padLeft + (idx + 0.5) * slotWidth;

              const presentHeight = Math.max(0, (dept.present / yMax) * chartHeight);
              const absentHeight = Math.max(0, (dept.absent / yMax) * chartHeight);

              const presentX = slotCenter - barWidth - barGap / 2;
              const absentX = slotCenter + barGap / 2;

              const presentY = padTop + chartHeight - presentHeight;
              const absentY = padTop + chartHeight - absentHeight;

              const isPresentHovered = hoveredBar?.deptId === dept.id && hoveredBar.type === 'present';
              const isAbsentHovered = hoveredBar?.deptId === dept.id && hoveredBar.type === 'absent';
              const isDeptHovered = hoveredBar?.deptId === dept.id;

              return (
                <g key={dept.id}>
                  {/* Present Vertical Bar (Blue) */}
                  <rect
                    x={presentX}
                    y={presentY}
                    width={barWidth}
                    height={Math.max(presentHeight, 2)}
                    rx={3}
                    ry={3}
                    fill="#2563eb"
                    tabIndex={0}
                    role="button"
                    aria-label={`${full} Present: ${dept.present}`}
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      opacity: hoveredBar && !isPresentHovered && !isDeptHovered ? 0.45 : 1,
                      outline: isPresentHovered ? '2px solid #1d4ed8' : 'none',
                      outlineOffset: '2px',
                      filter: isPresentHovered
                        ? 'drop-shadow(0 4px 8px rgba(37,99,235,0.4))'
                        : 'none',
                    }}
                    onFocus={() => {
                      setHoveredBar({
                        deptId: dept.id,
                        type: 'present',
                        name: full,
                        value: dept.present,
                        total: dept.total,
                        x: presentX + barWidth / 2,
                        y: presentY,
                      });
                    }}
                    onBlur={() => setHoveredBar(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setHoveredBar(null);
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                      if (rect) {
                        setHoveredBar({
                          deptId: dept.id,
                          type: 'present',
                          name: full,
                          value: dept.present,
                          total: dept.total,
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                        });
                      }
                    }}
                  />

                  {/* Present Value Label on Top of Bar */}
                  {dept.present > 0 && (
                    <text
                      x={presentX + barWidth / 2}
                      y={Math.max(padTop + 10, presentY - 4)}
                      textAnchor="middle"
                      fill="#2563eb"
                      fontSize="10"
                      fontWeight="800"
                    >
                      {dept.present}
                    </text>
                  )}

                  {/* Absent Vertical Bar (Coral Red) */}
                  <rect
                    x={absentX}
                    y={absentY}
                    width={barWidth}
                    height={Math.max(absentHeight, 2)}
                    rx={3}
                    ry={3}
                    fill="#f87171"
                    tabIndex={0}
                    role="button"
                    aria-label={`${full} Absent: ${dept.absent}`}
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      opacity: hoveredBar && !isAbsentHovered && !isDeptHovered ? 0.45 : 1,
                      outline: isAbsentHovered ? '2px solid #b91c1c' : 'none',
                      outlineOffset: '2px',
                      filter: isAbsentHovered
                        ? 'drop-shadow(0 4px 8px rgba(248,113,113,0.4))'
                        : 'none',
                    }}
                    onFocus={() => {
                      setHoveredBar({
                        deptId: dept.id,
                        type: 'absent',
                        name: full,
                        value: dept.absent,
                        total: dept.total,
                        x: absentX + barWidth / 2,
                        y: absentY,
                      });
                    }}
                    onBlur={() => setHoveredBar(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setHoveredBar(null);
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                      if (rect) {
                        setHoveredBar({
                          deptId: dept.id,
                          type: 'absent',
                          name: full,
                          value: dept.absent,
                          total: dept.total,
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                        });
                      }
                    }}
                  />

                  {/* Absent Value Label on Top of Bar */}
                  {dept.absent > 0 && (
                    <text
                      x={absentX + barWidth / 2}
                      y={Math.max(padTop + 10, absentY - 4)}
                      textAnchor="middle"
                      fill="#ef4444"
                      fontSize="10"
                      fontWeight="800"
                    >
                      {dept.absent}
                    </text>
                  )}

                  {/* Department X-Axis Label */}
                  <text
                    x={slotCenter}
                    y={padTop + chartHeight + 20}
                    textAnchor="middle"
                    fill={isDeptHovered ? '#0f172a' : '#475569'}
                    fontSize="11"
                    fontWeight={isDeptHovered ? '800' : '700'}
                    style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                    tabIndex={0}
                    onFocus={() => {
                      setHoveredBar({
                        deptId: dept.id,
                        type: 'present',
                        name: full,
                        value: dept.present,
                        total: dept.total,
                        x: slotCenter,
                        y: padTop + chartHeight / 2,
                      });
                    }}
                    onBlur={() => setHoveredBar(null)}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                      if (rect) {
                        setHoveredBar({
                          deptId: dept.id,
                          type: 'present',
                          name: full,
                          value: dept.present,
                          total: dept.total,
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                        });
                      }
                    }}
                  >
                    {short}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Interactive Floating Hover Tooltip Card */}
          {hoveredBar && (
            <Box
              sx={{
                position: 'absolute',
                left: Math.max(30, Math.min(svgWidth - 100, hoveredBar.x)),
                top: Math.max(15, hoveredBar.y - 10),
                transform: 'translate(-50%, -100%)',
                bgcolor: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: 2,
                px: 1.5,
                py: 0.75,
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12)',
                pointerEvents: 'none',
                zIndex: 10,
                whiteSpace: 'nowrap',
                transition: 'left 0.05s ease, top 0.05s ease',
              }}
            >
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 800, color: '#0f172a' }}>
                {hoveredBar.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mt: 0.3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      bgcolor: hoveredBar.type === 'present' ? '#2563eb' : '#ef4444',
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: hoveredBar.type === 'present' ? '#2563eb' : '#ef4444',
                    }}
                  >
                    {hoveredBar.type === 'present' ? 'Present' : 'Absent'} : {hoveredBar.value}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '0.6875rem', color: '#64748b' }}>
                  Total Staff: {hoveredBar.total}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Footer Legend */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          pt: 1.5,
          borderTop: '1px solid #f1f5f9',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: '#2563eb' }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>
            Present / Active
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: '#f87171' }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>
            Absent
          </Typography>
        </Box>
      </Box>
    </Card>
  );
};
