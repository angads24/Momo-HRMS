import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import type { OverviewMetrics, OverviewTabId } from './HrOverviewCards';

export interface HrWorkforceDistributionChartProps {
  metrics: OverviewMetrics;
  loading?: boolean;
  onSelectTab?: (tabId: OverviewTabId) => void;
}

interface SliceDefinition {
  id: string;
  tabId?: OverviewTabId;
  label: string;
  count: number;
  color: string;
  percentage: number;
  isGroup?: boolean;
  memberSliceIds?: string[];
}

// Convert polar coordinates to Cartesian (SVG space)
function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

// Generate SVG arc path for a donut segment
function describeDonutArc(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
): string {
  const delta = endAngle - startAngle;
  if (delta >= 359.99) {
    const mid = startAngle + 180;
    return `${describeDonutArc(cx, cy, innerR, outerR, startAngle, mid)} ${describeDonutArc(cx, cy, innerR, outerR, mid, endAngle)}`;
  }

  const startOuter = polarToCartesian(cx, cy, outerR, startAngle);
  const endOuter = polarToCartesian(cx, cy, outerR, endAngle);
  const startInner = polarToCartesian(cx, cy, innerR, endAngle);
  const endInner = polarToCartesian(cx, cy, innerR, startAngle);

  const largeArcFlag = delta > 180 ? 1 : 0;

  return [
    `M ${startOuter.x.toFixed(2)} ${startOuter.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${endOuter.x.toFixed(2)} ${endOuter.y.toFixed(2)}`,
    `L ${startInner.x.toFixed(2)} ${startInner.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${endInner.x.toFixed(2)} ${endInner.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

export const HrWorkforceDistributionChart: React.FC<HrWorkforceDistributionChartProps> = ({
  metrics,
  loading = false,
  onSelectTab,
}) => {
  const [activeHoverId, setActiveHoverId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [viewMode, setViewMode] = useState<'detailed' | 'simple'>('detailed');

  const total = Math.max(0, metrics.totalEmployees);
  const presentCount = Math.max(0, metrics.present);
  const absentCount = Math.max(0, metrics.absent);
  const workingCount = Math.max(0, metrics.working);
  const checkedOutCount = Math.max(0, metrics.checkedOut + (metrics.autoCheckout || 0));
  const pausedCount = Math.max(0, metrics.paused);

  // Define segments for the donut chart based on current viewMode
  const donutSlices = useMemo(() => {
    if (total === 0) return [];

    if (viewMode === 'simple') {
      // Simple Present vs Absent
      const pPct = Math.round((presentCount / total) * 100);
      const aPct = 100 - pPct;
      return [
        {
          id: 'present',
          tabId: 'present' as OverviewTabId,
          label: 'Present',
          count: presentCount,
          color: '#2563eb', // Royal Blue
          percentage: pPct,
        },
        {
          id: 'absent',
          tabId: 'absent' as OverviewTabId,
          label: 'Absent',
          count: absentCount,
          color: '#ef4444', // Coral Red
          percentage: aPct,
        },
      ].filter((s) => s.count > 0);
    }

    // Detailed: Working, Checked Out, Paused (if any), Absent
    const slices: Array<{
      id: string;
      tabId: OverviewTabId;
      label: string;
      count: number;
      color: string;
      percentage: number;
    }> = [
      {
        id: 'working',
        tabId: 'working',
        label: 'Working',
        count: workingCount,
        color: '#10b981', // Emerald Green
        percentage: Math.round((workingCount / total) * 100),
      },
      {
        id: 'checkout',
        tabId: 'checked-out',
        label: 'Checkout',
        count: checkedOutCount,
        color: '#0284c7', // Sky Blue / Slate
        percentage: Math.round((checkedOutCount / total) * 100),
      },
    ];

    if (pausedCount > 0) {
      slices.push({
        id: 'paused',
        tabId: 'paused',
        label: 'Paused',
        count: pausedCount,
        color: '#f59e0b', // Amber
        percentage: Math.round((pausedCount / total) * 100),
      });
    }

    slices.push({
      id: 'absent',
      tabId: 'absent',
      label: 'Absent',
      count: absentCount,
      color: '#ef4444', // Coral Red
      percentage: Math.round((absentCount / total) * 100),
    });

    return slices.filter((s) => s.count > 0);
  }, [total, presentCount, absentCount, workingCount, checkedOutCount, pausedCount, viewMode]);

  // Slices with computed arc angles
  const arcSegments = useMemo(() => {
    const totalCount = donutSlices.reduce((acc, s) => acc + s.count, 0);
    if (totalCount === 0) return [];

    let currentAngle = 0;
    const gapAngle = donutSlices.length > 1 ? 2.5 : 0; // Gap in degrees between slices

    return donutSlices.map((slice) => {
      const sliceAngle = (slice.count / totalCount) * 360;
      const startAngle = currentAngle + gapAngle / 2;
      const endAngle = currentAngle + sliceAngle - gapAngle / 2;
      currentAngle += sliceAngle;

      return {
        ...slice,
        startAngle,
        endAngle,
      };
    });
  }, [donutSlices]);

  // Legend items: exactly the 4 requested fields: Present, Absent, Working, Checkout
  const legendItems: SliceDefinition[] = useMemo(() => {
    const pct = (c: number) => (total > 0 ? Math.round((c / total) * 100) : 0);
    return [
      {
        id: 'present',
        tabId: 'present',
        label: 'Present',
        count: presentCount,
        color: '#2563eb', // Royal Blue
        percentage: pct(presentCount),
        isGroup: true,
        memberSliceIds: ['present', 'working', 'checkout', 'paused'],
      },
      {
        id: 'absent',
        tabId: 'absent',
        label: 'Absent',
        count: absentCount,
        color: '#ef4444', // Coral Red
        percentage: pct(absentCount),
        memberSliceIds: ['absent'],
      },
      {
        id: 'working',
        tabId: 'working',
        label: 'Working',
        count: workingCount,
        color: '#10b981', // Emerald Green
        percentage: pct(workingCount),
        memberSliceIds: ['working'],
      },
      {
        id: 'checkout',
        tabId: 'checked-out',
        label: 'Checkout',
        count: checkedOutCount,
        color: '#0284c7', // Sky Blue
        percentage: pct(checkedOutCount),
        memberSliceIds: ['checkout'],
      },
    ];
  }, [total, presentCount, absentCount, workingCount, checkedOutCount]);

  // Find currently active slice or legend item for hover state
  const activeHoverItem = useMemo(() => {
    if (!activeHoverId) return null;
    // Check legend items first
    const legendMatch = legendItems.find((l) => l.id === activeHoverId);
    if (legendMatch) return legendMatch;
    // Check donut slices
    const sliceMatch = donutSlices.find((s) => s.id === activeHoverId);
    if (sliceMatch) return sliceMatch;
    return null;
  }, [activeHoverId, legendItems, donutSlices]);

  const isSliceHighlighted = (sliceId: string) => {
    if (!activeHoverId) return false;
    if (activeHoverId === sliceId) return true;
    if (activeHoverId === 'present' && ['working', 'checkout', 'paused', 'present'].includes(sliceId)) {
      return true;
    }
    return false;
  };

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
        <Skeleton variant="text" width={220} height={32} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={140} height={20} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" width="100%" height={220} sx={{ borderRadius: 2 }} />
      </Card>
    );
  }

  const cx = 110;
  const cy = 110;
  const defaultInnerR = 58;
  const defaultOuterR = 85;

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
      {/* Header: Title + Subtitle + Mode Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: '1.125rem',
              color: '#0f172a',
              lineHeight: 1.25,
            }}
          >
            Workforce distribution
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: '#64748b',
              fontSize: '0.8125rem',
              mt: 0.5,
            }}
          >
            Current employee status
          </Typography>
        </Box>

        {/* Breakdown Mode Pill Switch */}
        <Box
          sx={{
            display: 'inline-flex',
            bgcolor: '#f1f5f9',
            borderRadius: 2,
            p: '3px',
            gap: '2px',
          }}
        >
          <Box
            component="button"
            type="button"
            role="tab"
            aria-selected={viewMode === 'detailed'}
            tabIndex={0}
            onClick={() => setViewMode('detailed')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setViewMode('detailed');
              }
            }}
            sx={{
              border: 'none',
              bgcolor: viewMode === 'detailed' ? '#ffffff' : 'transparent',
              color: viewMode === 'detailed' ? '#0f172a' : '#64748b',
              fontSize: '0.75rem',
              fontWeight: 600,
              px: 1.25,
              py: 0.5,
              borderRadius: 1.5,
              cursor: 'pointer',
              boxShadow: viewMode === 'detailed' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
              '&:focus-visible': {
                outline: '2px solid #2563eb',
                outlineOffset: 1,
              },
            }}
          >
            All Status
          </Box>
          <Box
            component="button"
            type="button"
            role="tab"
            aria-selected={viewMode === 'simple'}
            tabIndex={0}
            onClick={() => setViewMode('simple')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setViewMode('simple');
              }
            }}
            sx={{
              border: 'none',
              bgcolor: viewMode === 'simple' ? '#ffffff' : 'transparent',
              color: viewMode === 'simple' ? '#0f172a' : '#64748b',
              fontSize: '0.75rem',
              fontWeight: 600,
              px: 1.25,
              py: 0.5,
              borderRadius: 1.5,
              cursor: 'pointer',
              boxShadow: viewMode === 'simple' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
              '&:focus-visible': {
                outline: '2px solid #2563eb',
                outlineOffset: 1,
              },
            }}
          >
            Present / Absent
          </Box>
        </Box>
      </Box>

      {/* Middle Body: Donut Chart on Left + Legend on Right */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          justifyContent: 'space-around',
          gap: 3,
          my: 'auto',
          py: 1,
          position: 'relative',
        }}
      >
        {/* Left: Interactive Donut SVG */}
        <Box
          sx={{
            position: 'relative',
            width: 220,
            height: 220,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
          }}
          onMouseLeave={() => {
            setActiveHoverId(null);
            setTooltipPos(null);
          }}
        >
          <svg
            width="220"
            height="220"
            viewBox="0 0 220 220"
            style={{ overflow: 'visible', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.02))' }}
          >
            {/* Background Base Ring if 0 total employees or empty */}
            {arcSegments.length === 0 ? (
              <circle
                cx={cx}
                cy={cy}
                r={(defaultInnerR + defaultOuterR) / 2}
                fill="none"
                stroke="#f1f5f9"
                strokeWidth={defaultOuterR - defaultInnerR}
              />
            ) : (
              arcSegments.map((slice) => {
                const isHovered = isSliceHighlighted(slice.id);
                const hasHover = activeHoverId !== null;
                const outerR = isHovered ? defaultOuterR + 5 : defaultOuterR;
                const innerR = isHovered ? defaultInnerR - 2 : defaultInnerR;
                const pathD = describeDonutArc(cx, cy, innerR, outerR, slice.startAngle, slice.endAngle);

                return (
                  <path
                    key={slice.id}
                    d={pathD}
                    fill={slice.color}
                    tabIndex={0}
                    role="button"
                    aria-label={`${slice.label}: ${slice.count} employees`}
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                      opacity: hasHover && !isHovered ? 0.35 : 1,
                      filter: isHovered
                        ? 'drop-shadow(0 4px 10px rgba(0,0,0,0.22))'
                        : 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))',
                    }}
                    onFocus={() => {
                      setActiveHoverId(slice.id);
                      setTooltipPos({ x: 110, y: 80 });
                    }}
                    onBlur={() => {
                      setActiveHoverId(null);
                      setTooltipPos(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (slice.tabId && onSelectTab) {
                          onSelectTab(slice.tabId);
                        }
                      }
                    }}
                    onMouseEnter={(e) => {
                      setActiveHoverId(slice.id);
                      const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                      if (rect) {
                        setTooltipPos({
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                        });
                      }
                    }}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                      if (rect) {
                        setTooltipPos({
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                        });
                      }
                    }}
                    onClick={() => {
                      if (slice.tabId && onSelectTab) {
                        onSelectTab(slice.tabId);
                      }
                    }}
                  />
                );
              })
            )}
          </svg>

          {/* Center Content: Headcount or Hovered Status */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
              transition: 'transform 0.15s ease',
            }}
          >
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: activeHoverItem ? '1.875rem' : '2.125rem',
                color: activeHoverItem ? activeHoverItem.color : '#0f172a',
                lineHeight: 1,
                letterSpacing: '-0.03em',
                transition: 'color 0.15s ease',
              }}
            >
              {activeHoverItem ? activeHoverItem.count : total}
            </Typography>
            <Typography
              sx={{
                fontWeight: 600,
                fontSize: '0.8125rem',
                color: '#64748b',
                mt: 0.5,
                textTransform: activeHoverItem ? 'capitalize' : 'none',
              }}
            >
              {activeHoverItem ? activeHoverItem.label : 'Employees'}
            </Typography>
          </Box>

          {/* Hover Floating Tooltip Badge matching Image 2 */}
          {activeHoverItem && tooltipPos && (
            <Box
              sx={{
                position: 'absolute',
                left: Math.max(20, Math.min(200, tooltipPos.x)),
                top: Math.max(20, tooltipPos.y - 12),
                transform: 'translate(-50%, -100%)',
                bgcolor: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: 2,
                px: 1.5,
                py: 0.6,
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.12)',
                display: 'flex',
                alignItems: 'center',
                gap: 0.8,
                pointerEvents: 'none',
                zIndex: 10,
                whiteSpace: 'nowrap',
                transition: 'left 0.06s ease, top 0.06s ease',
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: activeHoverItem.color,
                }}
              />
              <Typography
                sx={{
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: '#0f172a',
                }}
              >
                {activeHoverItem.label} : {activeHoverItem.count}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: '#64748b',
                }}
              >
                ({activeHoverItem.percentage}%)
              </Typography>
            </Box>
          )}
        </Box>

        {/* Right: Legend with 4 requested fields: Present, Absent, Working, Checkout */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1.25,
            minWidth: 170,
            width: { xs: '100%', sm: 'auto' },
          }}
        >
          {legendItems.map((item) => {
            const isHovered = activeHoverId === item.id;
            return (
              <Box
                key={item.id}
                role="button"
                tabIndex={0}
                aria-label={`${item.label}: ${item.count} employees`}
                onMouseEnter={() => setActiveHoverId(item.id)}
                onMouseLeave={() => setActiveHoverId(null)}
                onFocus={() => setActiveHoverId(item.id)}
                onBlur={() => setActiveHoverId(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (item.tabId && onSelectTab) {
                      onSelectTab(item.tabId);
                    }
                  }
                }}
                onClick={() => {
                  if (item.tabId && onSelectTab) {
                    onSelectTab(item.tabId);
                  }
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 2,
                  cursor: 'pointer',
                  bgcolor: isHovered ? '#f8fafc' : 'transparent',
                  border: isHovered ? '1px solid #e2e8f0' : '1px solid transparent',
                  transition: 'all 0.18s ease',
                  '&:hover': {
                    bgcolor: '#f8fafc',
                  },
                  '&:focus-visible': {
                    outline: '2px solid #2563eb',
                    outlineOffset: 2,
                    bgcolor: '#f8fafc',
                  },
                }}
              >
                {/* Dot + Label */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: item.color,
                      flexShrink: 0,
                      boxShadow: isHovered ? `0 0 0 3px ${item.color}33` : 'none',
                      transition: 'box-shadow 0.18s ease',
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: isHovered ? 700 : 500,
                      color: isHovered ? '#0f172a' : '#334155',
                    }}
                  >
                    {item.label}
                  </Typography>
                </Box>

                {/* Count */}
                <Typography
                  sx={{
                    fontSize: '0.9375rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    fontVariantNumeric: 'tabular-nums',
                    ml: 3,
                  }}
                >
                  {item.count}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Footer: matching Image 2 */}
      <Box
        sx={{
          pt: 1.75,
          mt: 1.5,
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <LocationOnIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
        <Typography
          variant="caption"
          sx={{
            color: '#64748b',
            fontSize: '0.75rem',
            fontWeight: 500,
          }}
        >
          Remote &amp; on-site employees are included in headcount.
        </Typography>
      </Box>
    </Card>
  );
};
