import { useCallback, useEffect, useMemo, useRef, useState, useDeferredValue } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import CircularProgress from '@mui/material/CircularProgress';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { api } from '../api/client';
import { GEOFENCE_API_URL } from '../config/env';
import { useAuth } from '../context/AuthContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { PATHS } from '../routes/paths';
import { fetchActiveDepartments, fetchEmployees } from '../services/employeeService';
import {
  fetchCompanyAttendanceHistory,
  fetchCompanyTodayAttendance,
} from '../features/attendance/services/attendanceService';
import type { Employee, Department } from '../types/employee';
import type { AttendanceSession } from '../features/attendance/types/attendance';
import {
  isEmployeeInAnyOffice,
  isEmployeeInOffice,
  resolveHrAssignedOffices,
} from '../utils/officeJurisdiction';
import { HrOverviewCards, type OverviewMetrics, type OverviewTabId } from '../features/hr/components/HrOverviewCards';
import { HrWorkforceDistributionChart } from '../features/hr/components/HrWorkforceDistributionChart';
import { HrDepartmentChart, type DepartmentStat } from '../features/hr/components/HrDepartmentChart';
import { HrLiveAttendanceTable, type LiveAttendanceRow } from '../features/hr/components/HrLiveAttendanceTable';
import { useNotifications } from '../context/NotificationContext';

interface OfficeData {
  id: string;
  name: string;
  code: string;
}

export default function HrHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Search & Loading State
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [selectedFilterTab, setSelectedFilterTab] = useState<OverviewTabId>('total');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);



  // Real Backend Datasets
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [offices, setOffices] = useState<OfficeData[]>([]);
  const [historySessions, setHistorySessions] = useState<AttendanceSession[]>([]);
  const [todaySessions, setTodaySessions] = useState<AttendanceSession[]>([]);

  // HR Office Jurisdiction Scope State
  const [isHrScoped, setIsHrScoped] = useState(false);
  const [hrJurisdictionLabel, setHrJurisdictionLabel] = useState('');

  // Office Filter Selection State
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('ALL');

  // Live seconds ticker for active WORKING sessions
  const [liveSecondTick, setLiveSecondTick] = useState(0);

  // Concurrency & throttle guards
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);

  // Master Data Loading Routine (Employees, Departments, Offices, 7-day History, Today Sessions)
  const loadDashboardData = useCallback(async (isBackground = false, isSilent = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!isBackground) {
      setLoading(true);
    } else if (!isSilent) {
      setRefreshing(true);
    }
    setError(null);

    // Past 7 days date range (YYYY-MM-DD)
    const end = new Date();
    const start = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];

    try {
      // 1. Fetch Real Employees (complete transfer)
      const empPromise = fetchEmployees().catch((e) => {
        console.warn('Could not load employees:', e);
        return { data: [], meta: { page: 1, limit: 100, total: 0, totalPages: 1 } };
      });

      // 2. Fetch Real Departments
      const deptPromise = fetchActiveDepartments().catch((e) => {
        console.warn('Could not load departments:', e);
        return [] as Department[];
      });

      // 3. Fetch Real Workplace Offices (Geofences)
      const officePromise = api
        .get<{ data?: OfficeData[] } | OfficeData[]>(`${GEOFENCE_API_URL}/offices`)
        .then((res) => (Array.isArray(res.data) ? res.data : res.data?.data ?? []))
        .catch((e) => {
          console.warn('Could not load offices:', e);
          return [] as OfficeData[];
        });

      // 4. Fetch Real Attendance History for 7-day trend across all employees
      const historyPromise = fetchCompanyAttendanceHistory({
        startDate: startDateStr,
        endDate: endDateStr,
      })
        .then((res) => res.items ?? [])
        .catch((e) => {
          console.warn('Could not load attendance history:', e);
          return [] as AttendanceSession[];
        });

      // 5. Fetch Today's Attendance Sessions across all employees
      const todayPromise = fetchCompanyTodayAttendance()
        .then((res) => res.sessions ?? [])
        .catch((e) => {
          console.warn('Could not load today attendance:', e);
          return [] as AttendanceSession[];
        });

      const [empRes, deptsData, officesData, histSessions, todaySess] = await Promise.all([
        empPromise,
        deptPromise,
        officePromise,
        historyPromise,
        todayPromise,
      ]);

      const rawEmps = Array.isArray(empRes.data) ? empRes.data : [];
      const hrScope = await resolveHrAssignedOffices(user, officesData as any);

      if (user?.appRole === 'HR' && hrScope.isScoped) {
        const scopedEmps = rawEmps.filter((emp) =>
          isEmployeeInAnyOffice(emp, hrScope.assignedOffices)
        );
        setEmployees(scopedEmps);
        setOffices(hrScope.assignedOffices);
        setIsHrScoped(true);
        setHrJurisdictionLabel(hrScope.jurisdictionLabel);
      } else {
        setEmployees(rawEmps);
        setOffices(officesData);
        setIsHrScoped(false);
        setHrJurisdictionLabel('');
      }

      setDepartments(deptsData);
      setHistorySessions(histSessions);
      setTodaySessions(todaySess);
      lastFetchTimeRef.current = Date.now();
    } catch {
      setError('Unable to synchronize HR dashboard with backend services. Please retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [user]);

  // Lightweight Live Attendance Poller: Only fetches today's sessions (active clock-ins/outs)
  const refreshLiveAttendance = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const todayRes = await fetchCompanyTodayAttendance();
      const sessions = todayRes.sessions ?? [];
      setTodaySessions(sessions);
      lastFetchTimeRef.current = Date.now();
    } catch (e) {
      console.warn('Could not refresh live attendance sessions:', e);
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // Initial full load on mount
  useEffect(() => {
    void loadDashboardData(false);
  }, [loadDashboardData]);

  // Real-time synchronization: Silent poll ONLY today's live attendance every 20 seconds while visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshLiveAttendance();
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [refreshLiveAttendance]);

  // Window focus or tab visibility change: only refresh live attendance if > 15s since last fetch
  useEffect(() => {
    const onSync = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastFetchTimeRef.current > 15000) {
          void refreshLiveAttendance();
        }
      }
    };
    window.addEventListener('focus', onSync);
    document.addEventListener('visibilitychange', onSync);
    return () => {
      window.removeEventListener('focus', onSync);
      document.removeEventListener('visibilitychange', onSync);
    };
  }, [refreshLiveAttendance]);

  // Real-time notification updates (SSE): refresh live attendance
  const { latestNotification } = useNotifications();

  useEffect(() => {
    if (latestNotification) {
      void refreshLiveAttendance();
    }
  }, [latestNotification, refreshLiveAttendance]);

  // 1-second live working timer ticker
  useEffect(() => {
    const ticker = setInterval(() => {
      setLiveSecondTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  // Today's date string (YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Merge today sessions with history sessions for consistent session lookups
  const allKnownSessions = useMemo(() => {
    const map = new Map<string, AttendanceSession>();
    for (const s of historySessions) {
      map.set(s.id, s);
    }
    for (const s of todaySessions) {
      map.set(s.id, s);
    }
    return Array.from(map.values());
  }, [historySessions, todaySessions]);

  // Set of employee IDs within current scope (for session filtering)
  const scopedEmployeeIds = useMemo(() => {
    return new Set(employees.flatMap((e) => [e.id, e.employeeCode]).filter(Boolean));
  }, [employees]);

  // Today's recorded sessions (strictly scoped to visible employees if HR)
  const todaysRecordedSessions = useMemo(() => {
    const todayIds = new Set(todaySessions.map((s) => s.id));
    return allKnownSessions.filter((s) => {
      const isToday =
        todayIds.has(s.id) ||
        s.status === 'WORKING' ||
        s.status === 'PAUSED' ||
        s.attendanceDate?.startsWith(todayStr) ||
        s.checkInAt?.startsWith(todayStr);
      if (!isToday) return false;
      if (isHrScoped) return scopedEmployeeIds.has(s.employeeId);
      return true;
    });
  }, [allKnownSessions, todaySessions, todayStr, isHrScoped, scopedEmployeeIds]);

  // Map employee ID / employeeCode to their today's session
  const sessionByEmployee = useMemo(() => {
    const map = new Map<string, AttendanceSession>();
    // Sort so active sessions (WORKING / PAUSED) take precedence over closed sessions,
    // and later checkInAt takes precedence
    const sorted = [...todaysRecordedSessions].sort((a, b) => {
      const aActive = a.status === 'WORKING' || a.status === 'PAUSED' ? 1 : 0;
      const bActive = b.status === 'WORKING' || b.status === 'PAUSED' ? 1 : 0;
      if (aActive !== bActive) return aActive - bActive;
      return new Date(a.checkInAt).getTime() - new Date(b.checkInAt).getTime();
    });

    for (const s of sorted) {
      map.set(s.employeeId, s);
      const match = employees.find(
        (e) => e.id === s.employeeId || e.employeeCode === s.employeeId,
      );
      if (match) {
        map.set(match.id, s);
        if (match.employeeCode) map.set(match.employeeCode, s);
      }
    }
    return map;
  }, [todaysRecordedSessions, employees]);

  // Selected Office Object
  const selectedOffice = useMemo(() => {
    if (selectedOfficeId === 'ALL') return null;
    return (
      offices.find(
        (o) =>
          o.id === selectedOfficeId ||
          (o.code && o.code.toLowerCase() === selectedOfficeId.toLowerCase()),
      ) || null
    );
  }, [offices, selectedOfficeId]);

  // Employees Filtered by Selected Office (if any)
  const officeFilteredEmployees = useMemo(() => {
    if (!selectedOffice) return employees;
    return employees.filter((emp) => isEmployeeInOffice(emp, selectedOffice));
  }, [employees, selectedOffice]);

  // Total Active employees (respecting selected office)
  const activeEmployees = useMemo(() => {
    return officeFilteredEmployees.filter(
      (e) => (e.status || (e as any).employmentStatus || 'ACTIVE') === 'ACTIVE',
    );
  }, [officeFilteredEmployees]);

  // Calculated Overview Metrics (per employee, not raw session count)
  const overviewMetrics: OverviewMetrics = useMemo(() => {
    const totalEmployees = officeFilteredEmployees.length;
    // Get unique active sessions for active employees
    const uniqueEmployeeSessions = Array.from(
      new Map(
        activeEmployees.map((e) => [
          e.id,
          sessionByEmployee.get(e.id) || sessionByEmployee.get(e.employeeCode),
        ]),
      ).values(),
    ).filter(Boolean) as AttendanceSession[];

    const working = uniqueEmployeeSessions.filter((s) => s.status === 'WORKING').length;
    const paused = uniqueEmployeeSessions.filter((s) => s.status === 'PAUSED').length;
    const autoCheckout = uniqueEmployeeSessions.filter(
      (s) =>
        s.checkoutType === 'AUTO_CHECKOUT' ||
        (s.checkoutType as any) === 'AUTO' ||
        (s.checkoutType as any) === 'AUTO_MIDNIGHT' ||
        s.checkoutReason === 'GEOFENCE_TIMEOUT' ||
        s.status === 'AUTO_CHECKED_OUT',
    ).length;
    const checkedOut = uniqueEmployeeSessions.filter(
      (s) =>
        (s.status === 'COMPLETED' || (s.status as any) === 'CHECKED_OUT') &&
        s.checkoutType !== 'AUTO_CHECKOUT' &&
        (s.checkoutType as any) !== 'AUTO' &&
        (s.checkoutType as any) !== 'AUTO_MIDNIGHT' &&
        s.checkoutReason !== 'GEOFENCE_TIMEOUT' &&
        s.status !== 'AUTO_CHECKED_OUT',
    ).length;
    const present = working + paused + checkedOut + autoCheckout;
    const absent = Math.max(0, activeEmployees.length - present);

    return {
      totalEmployees,
      present,
      working,
      paused,
      checkedOut,
      absent,
      autoCheckout,
    };
  }, [officeFilteredEmployees, sessionByEmployee, activeEmployees]);


  // Department Stats
  const departmentStats: DepartmentStat[] = useMemo(() => {
    if (departments.length === 0) {
      const deptMap = new Map<string, { total: number; present: number }>();
      for (const emp of activeEmployees) {
        const dName = emp.department?.name || emp.department?.code || 'General';
        const current = deptMap.get(dName) || { total: 0, present: 0 };
        current.total += 1;
        if (sessionByEmployee.has(emp.id) || sessionByEmployee.has(emp.employeeCode)) {
          current.present += 1;
        }
        deptMap.set(dName, current);
      }

      return Array.from(deptMap.entries()).map(([name, stat], idx) => ({
        id: `dept-${idx}`,
        name,
        code: name.slice(0, 4).toUpperCase(),
        total: stat.total,
        present: stat.present,
        absent: Math.max(0, stat.total - stat.present),
      }));
    }

    return departments.map((dept) => {
      const deptEmployees = activeEmployees.filter(
        (e) =>
          e.department?.id === dept.id ||
          e.department?.name?.toLowerCase() === dept.name.toLowerCase() ||
          e.department?.code?.toLowerCase() === dept.code.toLowerCase(),
      );
      const total = deptEmployees.length;
      const present = deptEmployees.filter(
        (e) => sessionByEmployee.has(e.id) || sessionByEmployee.has(e.employeeCode),
      ).length;
      const absent = Math.max(0, total - present);

      return {
        id: dept.id,
        name: dept.name,
        code: dept.code || dept.name.slice(0, 4).toUpperCase(),
        total,
        present,
        absent,
      };
    });
  }, [departments, activeEmployees, sessionByEmployee]);

  // Live Attendance Monitor Rows (Filtered by search & selected office)
  const monitorRows: LiveAttendanceRow[] = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase();

    return officeFilteredEmployees
      .map((emp) => {
        const session = sessionByEmployee.get(emp.id) || sessionByEmployee.get(emp.employeeCode);
        const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Employee';
        const deptName = emp.department?.name || emp.department?.code || 'General';

        // Office Location
        let locName = emp.officeLocationName || '';
        if (!locName) {
          if (emp.assignedOffices && emp.assignedOffices.length > 0) {
            locName = emp.assignedOffices.map((o) => o.name).join(', ');
          } else {
            const assign = (emp as any).assignments?.[0];
            if (assign?.officeId) {
              const matchOffice = offices.find(
                (o) => o.id === assign.officeId || (o.code && o.code.toLowerCase() === assign.officeId.toLowerCase()),
              );
              if (matchOffice) locName = matchOffice.name;
            }
          }
        }
        if (!locName) {
          locName = offices[0]?.name || 'Pune Headquarters';
        }

        // Attendance Status
        let status: LiveAttendanceRow['status'] = 'ABSENT';
        let checkInTime: string | null = null;
        let workingSeconds = 0;
        let pausedSeconds = 0;

        if (session) {
          if (session.status === 'WORKING') {
            status = 'WORKING';
          } else if (session.status === 'PAUSED') {
            status = 'PAUSED';
          } else if (
            session.checkoutType === 'AUTO_CHECKOUT' ||
            (session.checkoutType as string) === 'AUTO' ||
            (session.checkoutType as any) === 'AUTO_MIDNIGHT' ||
            session.checkoutReason === 'GEOFENCE_TIMEOUT' ||
            session.status === 'AUTO_CHECKED_OUT'
          ) {
            status = 'AUTO_CHECKED_OUT';
          } else if (session.status === 'COMPLETED' || (session.status as any) === 'CHECKED_OUT') {
            status = 'CHECKED_OUT';
          }

          if (session.checkInAt) {
            const d = new Date(session.checkInAt);
            checkInTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          }

          workingSeconds = session.totalWorkingSeconds || 0;
          pausedSeconds = session.totalPausedSeconds || 0;

          // Increment working seconds if session is actively WORKING
          if (status === 'WORKING') {
            workingSeconds += liveSecondTick % 60;
          } else if (status === 'PAUSED' && (session as any).currentPauseStartedAt) {
            const currentPauseDuration = Math.max(
              0,
              Math.floor((Date.now() - new Date((session as any).currentPauseStartedAt).getTime()) / 1000),
            );
            pausedSeconds = Math.max(pausedSeconds, currentPauseDuration);
          }
        }

        const workingHours = Math.floor(workingSeconds / 3600);
        const workingMins = Math.floor((workingSeconds % 3600) / 60);
        const workingFormatted =
          status === 'ABSENT' ? '—' : `${workingHours}h ${String(workingMins).padStart(2, '0')}m`;

        const pausedMins = Math.floor(pausedSeconds / 60);
        const pausedFormatted = status === 'ABSENT' ? '—' : `${String(pausedMins).padStart(2, '0')}m`;

        return {
          id: emp.id,
          employeeCode: emp.employeeCode,
          name: fullName,
          department: deptName,
          location: locName,
          checkInTime,
          status,
          workingTimeFormatted: workingFormatted,
          pausedTimeFormatted: pausedFormatted,
          profilePhotoUrl: emp.profilePhotoUrl,
        };
      })
      .filter((row) => {
        // Tab Filtering
        if (selectedFilterTab === 'present') {
          if (row.status === 'ABSENT') return false;
        } else if (selectedFilterTab === 'working') {
          if (row.status !== 'WORKING') return false;
        } else if (selectedFilterTab === 'paused') {
          if (row.status !== 'PAUSED') return false;
        } else if (selectedFilterTab === 'checked-out') {
          if (row.status !== 'CHECKED_OUT') return false;
        } else if (selectedFilterTab === 'absent') {
          if (row.status !== 'ABSENT') return false;
        } else if (selectedFilterTab === 'auto-checkout') {
          if (row.status !== 'AUTO_CHECKED_OUT') return false;
        }

        // Search Filter
        if (!q) return true;
        return (
          row.name.toLowerCase().includes(q) ||
          row.employeeCode.toLowerCase().includes(q) ||
          row.department.toLowerCase().includes(q) ||
          row.location.toLowerCase().includes(q)
        );
      });
  }, [officeFilteredEmployees, sessionByEmployee, offices, selectedFilterTab, deferredSearchQuery, liveSecondTick]);

  const currentDateDisplay = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle={`HR Administration • ${user?.fullName ? `${user.fullName} • ` : ''}${currentDateDisplay}`}
      hideUserCard
      maxWidth="xl"
    >
      {/* Office Jurisdiction Scope Banner (for HR users) */}
      {isHrScoped && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2.5,
            bgcolor: 'rgba(156, 39, 176, 0.04)',
            border: '1px solid',
            borderColor: 'rgba(156, 39, 176, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: 'rgba(156, 39, 176, 0.12)',
                color: 'secondary.main',
                display: 'flex',
              }}
            >
              <LocationOnIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Office Jurisdiction: {hrJurisdictionLabel}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
                Showing staff, live attendance monitors, working hours, and analytics belonging exclusively to your assigned office.
              </Typography>
            </Box>
          </Box>
          <Chip
            icon={<LocationOnIcon fontSize="small" />}
            label="Workplace Scoped"
            color="secondary"
            size="small"
            sx={{ fontWeight: 600, height: 26 }}
          />
        </Paper>
      )}

      {/* Top Search & Refresh Action Toolbar */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: '#16a34a',
              boxShadow: '0 0 0 3px rgba(22, 163, 74, 0.2)',
            }}
          />
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#475569' }}>
            Live Attendance Monitor &bull; Real Backend Data
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
          {/* Office Selection Filter */}
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 220 }, bgcolor: '#ffffff' }}>
            <InputLabel id="hr-office-select-label" sx={{ fontSize: '0.85rem' }}>
              Filter by Office
            </InputLabel>
            <Select
              labelId="hr-office-select-label"
              value={selectedOfficeId}
              label="Filter by Office"
              onChange={(e) => setSelectedOfficeId(e.target.value)}
              sx={{
                borderRadius: 2.5,
                fontSize: '0.85rem',
                '& fieldset': { borderColor: selectedOfficeId !== 'ALL' ? '#2563eb' : '#e2e8f0' },
              }}
              startAdornment={
                <InputAdornment position="start">
                  <LocationOnIcon fontSize="small" sx={{ color: selectedOfficeId !== 'ALL' ? '#2563eb' : '#94a3b8' }} />
                </InputAdornment>
              }
            >
              <MenuItem value="ALL">
                <em>🏢 All Offices ({employees.length} Staff)</em>
              </MenuItem>
              {offices.map((off) => {
                const count = employees.filter((emp) => isEmployeeInOffice(emp, off)).length;
                return (
                  <MenuItem key={off.id} value={off.id}>
                    {off.name} ({count} staff)
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          {/* Active Filter Clear Chip */}
          {selectedOfficeId !== 'ALL' && selectedOffice && (
            <Chip
              icon={<LocationOnIcon fontSize="small" />}
              label={`Office: ${selectedOffice.name}`}
              color="primary"
              size="small"
              onDelete={() => setSelectedOfficeId('ALL')}
              sx={{ fontWeight: 600, height: 32 }}
            />
          )}

          {/* Search Input */}
          <TextField
            size="small"
            placeholder="Search employees, department, office..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              width: { xs: '100%', sm: 260 },
              bgcolor: '#ffffff',
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5,
                fontSize: '0.85rem',
                '& fieldset': {
                  borderColor: '#e2e8f0',
                },
                '&:hover fieldset': {
                  borderColor: '#cbd5e1',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#2563eb',
                },
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* Refresh Action */}
          <Tooltip title="Refresh real-time data">
            <IconButton
              size="small"
              onClick={() => void loadDashboardData(true)}
              disabled={loading || refreshing}
              sx={{
                p: 1,
                border: '1px solid #e2e8f0',
                borderRadius: 2,
                color: '#64748b',
                bgcolor: '#ffffff',
                '&:hover': { bgcolor: '#f8fafc', color: '#0f172a' },
              }}
            >
              {refreshing ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Error Alert with Retry button */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3, borderRadius: 2.5 }}
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={() => void loadDashboardData(false)}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Section 7: Today's Overview KPI Cards (Interactive Filter Tabs) */}
      <HrOverviewCards
        metrics={overviewMetrics}
        loading={loading}
        selectedTab={selectedFilterTab}
        onSelectTab={(tabId) => setSelectedFilterTab(tabId)}
      />

      {/* Section 9 & 10: Charts Row (7-Day Attendance Trend + Department Breakdown) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: 3,
          mb: 3,
        }}
      >
        {/* Left Chart: Workforce Distribution Donut Chart */}
        <HrWorkforceDistributionChart
          metrics={overviewMetrics}
          loading={loading}
          onSelectTab={(tabId) => setSelectedFilterTab(tabId)}
        />

        {/* Right Chart: By Department Bar Chart */}
        <HrDepartmentChart
          data={departmentStats}
          departments={departments}
          employees={officeFilteredEmployees}
          allSessions={allKnownSessions}
          loading={loading}
        />
      </Box>

      {/* Section 11: Live Attendance Monitor Table */}
      <HrLiveAttendanceTable
        rows={monitorRows}
        totalEmployees={officeFilteredEmployees.length}
        loading={loading}
        selectedFilterTab={selectedFilterTab}
        onClearFilter={() => setSelectedFilterTab('total')}
        onSelectEmployee={(empId) => navigate(PATHS.hrEmployeeReport(empId))}
      />
    </DashboardLayout>
  );
}
