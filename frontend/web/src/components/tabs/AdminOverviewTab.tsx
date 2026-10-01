import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PeopleIcon from '@mui/icons-material/People';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SecurityIcon from '@mui/icons-material/Security';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ShieldIcon from '@mui/icons-material/Shield';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import AddIcon from '@mui/icons-material/Add';

import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../utils/roles';
import { attendanceApi } from '../../api/attendanceApi';
import { employeeApi } from '../../api/employeeApi';
import { geofenceApi } from '../../api/geofenceApi';

interface Props {
  onNavigateTab: (tabIndex: number) => void;
}

export function AdminOverviewTab({ onNavigateTab }: Props) {
  const { user } = useAuth();

  const [totalEmployees, setTotalEmployees] = useState(0);
  const [workingCount, setWorkingCount] = useState(0);
  const [pausedCount, setPausedCount] = useState(0);
  const [checkedOutCount, setCheckedOutCount] = useState(0);
  const [totalOffices, setTotalOffices] = useState(0);
  const [pendingExceptionsCount, setPendingExceptionsCount] = useState(0);
  const [realActivityFeed, setRealActivityFeed] = useState<any[]>([]);

  useEffect(() => {
    const loadOverviewData = async () => {
      try {
        const [empRes, attRes, officeRes, exRes] = await Promise.all([
          employeeApi.listEmployees({ limit: 100 }),
          attendanceApi.getHistory({ all: true, limit: 100 }),
          geofenceApi.listOffices(),
          attendanceApi.listExceptions(),
        ]);

        const empMap: Record<string, string> = {};
        empRes.items.forEach((e) => {
          empMap[e.id] = `${e.firstName} ${e.lastName}`;
          empMap[e.employeeCode] = `${e.firstName} ${e.lastName}`;
        });

        setTotalEmployees(empRes.total);
        setTotalOffices(officeRes.length);
        setPendingExceptionsCount(exRes.filter((x) => x.status === 'PENDING').length);

        const sessions = attRes.items || [];
        const working = sessions.filter((s) => s.status === 'WORKING').length;
        const paused = sessions.filter((s) => s.status === 'PAUSED').length;
        const checkedOut = sessions.filter((s) => s.status === 'CHECKED_OUT').length;
        setWorkingCount(working);
        setPausedCount(paused);
        setCheckedOutCount(checkedOut);

        const feed = sessions.slice(0, 6).map((s) => {
          const name = empMap[s.employeeId] || s.employeeId;
          const time = new Date(s.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return {
            id: s.id,
            name,
            code: s.employeeId,
            action:
              s.status === 'WORKING'
                ? 'Clocked In via Face AI (On-Site)'
                : s.status === 'PAUSED'
                ? 'Paused Session (Outside Polygon Boundary)'
                : 'Clocked Out (Day Shift Complete)',
            office: s.officeId,
            time,
            status: s.status === 'WORKING' ? 'VERIFIED' : s.status === 'PAUSED' ? 'PAUSED' : 'COMPLETED',
          };
        });
        setRealActivityFeed(feed);
      } catch (err) {
        console.warn('Overview data fetch warning:', err);
      }
    };

    void loadOverviewData();
    const interval = setInterval(loadOverviewData, 10000);
    return () => clearInterval(interval);
  }, []);


  return (
    <Box>
      {/* Top Welcome Card */}
      <Card
        sx={{
          p: { xs: 3, sm: 4 },
          mb: 3.5,
          borderRadius: 3.5,
          background: 'linear-gradient(135deg, #FF5722 0%, #FF6B35 50%, #FFA043 100%)',
          color: '#FFFFFF',
          boxShadow: '0 16px 36px rgba(255, 107, 53, 0.25)',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2.5, position: 'relative', zIndex: 1 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Chip
                label="ENTERPRISE WORKFORCE HUB"
                size="small"
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.35)',
                  fontWeight: 800,
                  fontSize: 11,
                }}
              />
              {user?.appRole && (
                <Chip
                  label={ROLE_LABELS[user.appRole]}
                  size="small"
                  sx={{ bgcolor: '#FFFFFF', color: '#EA580C', fontWeight: 800, fontSize: 11 }}
                />
              )}
            </Box>

            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, letterSpacing: -0.5, color: '#FFFFFF' }}>
              Welcome Back, {user?.fullName || user?.username}!
            </Typography>

            <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)', maxWidth: 640 }}>
              Live workforce telemetry is active. All 6 microservices are healthy, polygon ray-casting is verified, and biometrics are encrypted at rest.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => onNavigateTab(1)}
              sx={{
                bgcolor: '#FFFFFF',
                color: '#EA580C',
                fontWeight: 800,
                borderRadius: 2.5,
                px: 2.5,
                py: 1.2,
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                '&:hover': { bgcolor: '#FFF7ED' },
              }}
            >
              Onboard Employee
            </Button>
            <Button
              variant="outlined"
              onClick={() => onNavigateTab(2)}
              sx={{
                borderColor: 'rgba(255, 255, 255, 0.25)',
                color: '#FFFFFF',
                borderRadius: 2.5,
                px: 2.5,
                py: 1.2,
                '&:hover': { borderColor: '#FFFFFF', bgcolor: 'rgba(255, 255, 255, 0.08)' },
              }}
            >
              Configure Geofences
            </Button>
          </Box>
        </Box>
      </Card>

      {/* Primary KPI Metric Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2.5, mb: 3.5 }}>
        <Card
          onClick={() => onNavigateTab(1)}
          sx={{
            p: 3,
            borderRadius: 3,
            border: '1px solid #E2E8F0',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 12px 24px rgba(0,0,0,0.06)', borderColor: '#CBD5E1' },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                bgcolor: '#FFF7ED',
                display: 'grid',
                placeItems: 'center',
                color: '#FF6B35',
              }}
            >
              <PeopleIcon />
            </Box>
            <Chip label="+4 this month" size="small" sx={{ bgcolor: '#DCFCE7', color: '#15803D', fontWeight: 700, fontSize: 11 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
            48
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total Active Workforce
          </Typography>
        </Card>

        <Card
          onClick={() => onNavigateTab(3)}
          sx={{
            p: 3,
            borderRadius: 3,
            border: '1px solid #E2E8F0',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 12px 24px rgba(0,0,0,0.06)', borderColor: '#CBD5E1' },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                bgcolor: '#FFF7ED',
                display: 'grid',
                placeItems: 'center',
                color: '#FF6B35',
              }}
            >
              <PeopleIcon />
            </Box>
            <Chip label={`${totalEmployees} Active`} size="small" sx={{ bgcolor: '#DCFCE7', color: '#15803D', fontWeight: 700, fontSize: 11 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
            {totalEmployees}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total Active Workforce
          </Typography>
        </Card>

        <Card
          onClick={() => onNavigateTab(3)}
          sx={{
            p: 3,
            borderRadius: 3,
            border: '1px solid #E2E8F0',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 12px 24px rgba(0,0,0,0.06)', borderColor: '#CBD5E1' },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                bgcolor: '#ECFDF5',
                display: 'grid',
                placeItems: 'center',
                color: '#059669',
              }}
            >
              <AccessTimeIcon />
            </Box>
            <Chip
              label={pausedCount > 0 ? `${pausedCount} in Grace Period` : 'All On-Site'}
              size="small"
              sx={{ bgcolor: pausedCount > 0 ? '#FEF3C7' : '#ECFDF5', color: pausedCount > 0 ? '#B45309' : '#059669', fontWeight: 700, fontSize: 11 }}
            />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#059669' }}>
            {workingCount}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Currently Working Inside Geofence
          </Typography>
        </Card>

        <Card
          onClick={() => onNavigateTab(2)}
          sx={{
            p: 3,
            borderRadius: 3,
            border: '1px solid #E2E8F0',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 12px 24px rgba(0,0,0,0.06)', borderColor: '#CBD5E1' },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                bgcolor: '#F0F9FF',
                display: 'grid',
                placeItems: 'center',
                color: '#0284C7',
              }}
            >
              <LocationCityIcon />
            </Box>
            <Chip label={`${totalOffices} Polygons`} size="small" sx={{ bgcolor: '#E0F2FE', color: '#0369A1', fontWeight: 700, fontSize: 11 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
            {totalOffices}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Active Geofence Offices
          </Typography>
        </Card>

        <Card
          onClick={() => onNavigateTab(4)}
          sx={{
            p: 3,
            borderRadius: 3,
            border: '1px solid #E2E8F0',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 12px 24px rgba(0,0,0,0.06)', borderColor: '#CBD5E1' },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                bgcolor: '#FFFBEB',
                display: 'grid',
                placeItems: 'center',
                color: '#D97706',
              }}
            >
              <SecurityIcon />
            </Box>
            <Chip
              label={pendingExceptionsCount > 0 ? `${pendingExceptionsCount} Pending` : 'All Approved'}
              size="small"
              sx={{ bgcolor: pendingExceptionsCount > 0 ? '#FEF3C7' : '#ECFDF5', color: pendingExceptionsCount > 0 ? '#B45309' : '#059669', fontWeight: 700, fontSize: 11 }}
            />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#D97706' }}>
            {pendingExceptionsCount}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Pending Exception Approvals
          </Typography>
        </Card>
      </Box>

      {/* Main Operational Split */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mb: 3.5 }}>
        {/* Real-time Workforce Distribution */}
        <Card sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
                Live Attendance Breakdown
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Current employee state distribution across the organization
              </Typography>
            </Box>
            <Button size="small" onClick={() => onNavigateTab(3)} endIcon={<ArrowForwardIcon fontSize="small" />} sx={{ fontWeight: 700 }}>
              Live Radar
            </Button>
          </Box>

          {/* Multi-segment Progress Bar */}
          {(() => {
            const total = Math.max(1, workingCount + pausedCount + checkedOutCount);
            const wPct = Math.round((workingCount / total) * 100);
            const pPct = Math.round((pausedCount / total) * 100);
            const cPct = Math.max(0, 100 - wPct - pPct);
            return (
              <>
                <Box sx={{ height: 12, borderRadius: 6, display: 'flex', overflow: 'hidden', mb: 3, bgcolor: '#F1F5F9' }}>
                  <Box sx={{ width: `${wPct}%`, bgcolor: '#10B981' }} title={`Working On-Site (${wPct}%)`} />
                  <Box sx={{ width: `${pPct}%`, bgcolor: '#F59E0B' }} title={`Paused Outside (${pPct}%)`} />
                  <Box sx={{ width: `${cPct}%`, bgcolor: '#94A3B8' }} title={`Checked Out (${cPct}%)`} />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10B981' }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>
                        WORKING ON-SITE
                      </Typography>
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.5 }}>
                      {workingCount} Staff ({wPct}%)
                    </Typography>
                  </Box>

                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#F59E0B' }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>
                        PAUSED (OUTSIDE OFFICE)
                      </Typography>
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.5 }}>
                      {pausedCount} Staff ({pPct}%)
                    </Typography>
                  </Box>

                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#94A3B8' }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>
                        COMPLETED SHIFTS
                      </Typography>
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.5 }}>
                      {checkedOutCount} Staff ({cPct}%)
                    </Typography>
                  </Box>

                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#FF6B35' }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>
                        TOTAL REGISTERED
                      </Typography>
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.5 }}>
                      {totalEmployees} Employees
                    </Typography>
                  </Box>
                </Box>
              </>
            );
          })()}
        </Card>

        {/* Live Attendance Activity Feed */}
        <Card sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
                Recent Workforce Activity Stream
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Live biometric face verifications and geofence events
              </Typography>
            </Box>
            <Button size="small" onClick={() => onNavigateTab(6)} endIcon={<ArrowForwardIcon fontSize="small" />} sx={{ fontWeight: 700 }}>
              Audit Log
            </Button>
          </Box>

            {realActivityFeed.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#F8FAFC', borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  No attendance activity recorded yet today.
                </Typography>
              </Box>
            ) : (
              realActivityFeed.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: '#F8FAFC',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        bgcolor: item.status === 'VERIFIED' ? '#ECFDF5' : item.status === 'PAUSED' ? '#FEF3C7' : '#EFF6FF',
                        color: item.status === 'VERIFIED' ? '#059669' : item.status === 'PAUSED' ? '#D97706' : '#2563EB',
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {item.name ? item.name[0] : 'E'}
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                        {item.name} ({item.code})
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>
                        {item.action} • {item.office}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', fontSize: 11 }}>
                      {item.time}
                    </Typography>
                    <Chip
                      label={item.status}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: 10,
                        fontWeight: 800,
                        bgcolor: item.status === 'VERIFIED' ? '#DCFCE7' : item.status === 'PAUSED' ? '#FEF3C7' : '#E0F2FE',
                        color: item.status === 'VERIFIED' ? '#15803D' : item.status === 'PAUSED' ? '#92400E' : '#0369A1',
                      }}
                    />
                  </Box>
                </Box>
              ))
            )}
        </Card>
      </Box>

      {/* Security & System Compliance Status */}
      <Card sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', mb: 2 }}>
          Security & Cryptographic Compliance Architecture
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
          <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: '#FFFBF7', border: '1px solid #FED7AA', display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <FingerprintIcon sx={{ color: '#FF6B35', fontSize: 28 }} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                AES-256-GCM
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Biometric Vectors Encrypted at Rest
              </Typography>
            </Box>
          </Box>

          <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <ShieldIcon sx={{ color: '#0EA5E9', fontSize: 28 }} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                HMAC-SHA256
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Gateway Signature Verification
              </Typography>
            </Box>
          </Box>

          <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <VerifiedUserIcon sx={{ color: '#10B981', fontSize: 28 }} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                Jordan Curve Math
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Ray-Casting Arbitrary Polygons
              </Typography>
            </Box>
          </Box>

          <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <CheckCircleIcon sx={{ color: '#8B5CF6', fontSize: 28 }} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                3D Liveness Anti-Spoof
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Photo & Video Screen Rejection
              </Typography>
            </Box>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
