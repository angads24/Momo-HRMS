import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card, Divider, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getAttendanceHistory } from '../api/attendanceApi';
import type { AttendanceSession } from '../api/attendanceApi';
import { ScreenHeader } from '../components/ScreenHeader';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { palette } from '../theme/theme';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
}

function formatTimeToHhMm(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

function AttendanceStatusBadge({ status, isLate }: { status?: string; isLate?: boolean }) {
  if (!status) {
    return (
      <View style={styles.absentBadge}>
        <Text style={styles.absentBadgeText}>No Record / Absent</Text>
      </View>
    );
  }

  const isWorking = status === 'WORKING';
  const isPaused = status === 'PAUSED';
  const isAuto = status === 'AUTO_CHECKED_OUT' || status === 'AUTO_MIDNIGHT';
  const formattedText = status.replace(/_/g, ' ');

  return (
    <View style={styles.logBadgesRow}>
      {isLate && (
        <View style={styles.lateBadge}>
          <Text style={styles.lateBadgeText}>Late</Text>
        </View>
      )}
      <View
        style={[
          styles.statusBadge,
          isWorking && styles.statusBadgeWorking,
          isPaused && styles.statusBadgePaused,
          isAuto && styles.statusBadgeAuto,
        ]}
      >
        <Text
          style={[
            styles.statusBadgeText,
            isWorking && styles.statusBadgeTextWorking,
            isPaused && styles.statusBadgeTextPaused,
            isAuto && styles.statusBadgeTextAuto,
          ]}
        >
          {formattedText}
        </Text>
      </View>
    </View>
  );
}

export default function MyAttendanceScreen() {
  const navigation = useNavigation();
  const { employeeProfile, user } = useAuth();

  // Current calendar selection (defaults to current date, e.g. Sep/Oct 2026)
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [activeTab, setActiveTab] = useState<'calendar' | 'log' | 'detail'>('calendar');
  const [inspectedDay, setInspectedDay] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth(); // 0-indexed

  // Month navigation helpers
  const handlePrevMonth = () => {
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const prevMonthName = SHORT_MONTHS[(currentMonth + 11) % 12];
  const nextMonthName = SHORT_MONTHS[(currentMonth + 1) % 12];
  const monthTitle = `${MONTH_NAMES[currentMonth]} ${currentYear}`;

  const loadMonthData = useCallback(async () => {
    setError(null);
    try {
      const empId = employeeProfile?.employeeCode || employeeProfile?.id || user?.id;
      const startStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const endStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

      // Query records for this month
      const records = await getAttendanceHistory(empId, 100, startStr, endStr);
      setSessions(records);
    } catch (err: unknown) {
      console.warn('Failed to load month attendance records:', err);
      setError('Unable to load attendance records for this month.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentYear, currentMonth, employeeProfile?.employeeCode, employeeProfile?.id, user?.id]);

  useEffect(() => {
    setLoading(true);
    loadMonthData();
  }, [loadMonthData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMonthData();
  };

  // Map sessions by date (YYYY-MM-DD)
  const sessionMap = useMemo(() => {
    const map = new Map<string, AttendanceSession[]>();
    sessions.forEach((s) => {
      const d = s.attendanceDate ? String(s.attendanceDate).slice(0, 10) : '';
      if (!d) return;
      const existing = map.get(d) || [];
      existing.push(s);
      map.set(d, existing);
    });
    return map;
  }, [sessions]);

  // Compute month summary statistics
  const stats = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    let presentDays = 0;
    let absentDays = 0;
    let lateCount = 0;
    let autoCheckoutCount = 0;
    let totalWorkingSeconds = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(currentYear, currentMonth, day);
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = (dateObj.getDay() + 6) % 7; // 0=Mon, ..., 6=Sun
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
      const isPastOrToday = dateStr <= todayStr;

      const daySessions = sessionMap.get(dateStr) || [];
      if (daySessions.length > 0) {
        presentDays++;
        daySessions.forEach((s) => {
          totalWorkingSeconds += s.totalWorkingSeconds || 0;
          if (s.checkInStatus === 'LATE') lateCount++;
          if (s.status === 'AUTO_CHECKED_OUT' || s.checkoutType === 'AUTO_MIDNIGHT') autoCheckoutCount++;
        });
      } else if (!isWeekend && isPastOrToday) {
        absentDays++;
      }
    }

    const totalHours = Math.round(totalWorkingSeconds / 3600);
    const avgSecondsPerPresentDay = presentDays > 0 ? Math.round(totalWorkingSeconds / presentDays) : 0;
    const avgDailyH = Math.floor(avgSecondsPerPresentDay / 3600);
    const avgDailyM = Math.floor((avgSecondsPerPresentDay % 3600) / 60);

    return {
      present: presentDays,
      absent: absentDays,
      late: lateCount,
      totalHours: `${totalHours}h`,
      avgDaily: `${avgDailyH}h ${avgDailyM}m`,
      autoCheckout: autoCheckoutCount,
    };
  }, [currentYear, currentMonth, sessionMap]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfWeek = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // 0=Mon

    const days: Array<{
      dayNum: number | null;
      dateStr: string;
      isWeekend: boolean;
      statusType: 'PRESENT' | 'LATE' | 'ABSENT' | 'AUTO_CHECKOUT' | 'WEEKEND' | 'FUTURE' | 'EMPTY';
      subtext: string;
      session?: AttendanceSession;
    }> = [];

    // Empty offset cells before 1st of month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({
        dayNum: null,
        dateStr: `empty-${i}`,
        isWeekend: false,
        statusType: 'EMPTY',
        subtext: '',
      });
    }

    // Days in month
    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(currentYear, currentMonth, d);
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = (dateObj.getDay() + 6) % 7;
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
      const isPastOrToday = dateStr <= todayStr;

      const daySessions = sessionMap.get(dateStr) || [];
      const primarySession = daySessions[0];

      let statusType: 'PRESENT' | 'LATE' | 'ABSENT' | 'AUTO_CHECKOUT' | 'WEEKEND' | 'FUTURE' | 'EMPTY' = 'FUTURE';
      let subtext = '';

      if (daySessions.length > 0 && primarySession) {
        const checkInTimeStr = formatTimeToHhMm(primarySession.checkInAt);
        if (primarySession.status === 'AUTO_CHECKED_OUT' || primarySession.checkoutType === 'AUTO_MIDNIGHT') {
          statusType = 'AUTO_CHECKOUT';
          subtext = checkInTimeStr;
        } else if (primarySession.checkInStatus === 'LATE') {
          statusType = 'LATE';
          subtext = checkInTimeStr;
        } else {
          statusType = 'PRESENT';
          subtext = checkInTimeStr;
        }
      } else if (isWeekend) {
        statusType = 'WEEKEND';
        subtext = '';
      } else if (isPastOrToday) {
        statusType = 'ABSENT';
        subtext = 'Absent';
      } else {
        statusType = 'FUTURE';
        subtext = '';
      }

      days.push({
        dayNum: d,
        dateStr,
        isWeekend,
        statusType,
        subtext,
        session: primarySession,
      });
    }

    return days;
  }, [currentYear, currentMonth, sessionMap]);

  // Inspected day data
  const inspectedSessions = sessionMap.get(inspectedDay) || [];
  const primaryInspectedSession = inspectedSessions[0];

  const inspectedShortLabel = useMemo(() => {
    try {
      const d = new Date(inspectedDay);
      return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()} Detail`;
    } catch {
      return 'Day Detail';
    }
  }, [inspectedDay]);

  const handleDayPress = (dateStr: string) => {
    if (!dateStr || dateStr.startsWith('empty')) return;
    setInspectedDay(dateStr);
    setActiveTab('detail');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <ScreenHeader
        title="My Attendance"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[palette.primary]} />
        }
      >
        {/* Month Navigator Header Bar */}
        <View style={styles.monthHeaderRow}>
          <View>
            <Text style={styles.pageTitle}>My Attendance</Text>
            <Text style={styles.pageSubtitle}>{monthTitle}</Text>
          </View>

          <View style={styles.monthNavGroup}>
            <TouchableOpacity style={styles.monthNavBtn} onPress={handlePrevMonth} activeOpacity={0.7}>
              <MaterialCommunityIcons name="menu-left" size={20} color={palette.ink} />
              <Text style={styles.monthNavBtnText}>{prevMonthName}</Text>
            </TouchableOpacity>

            <Text style={styles.monthNavLabel}>{monthTitle}</Text>

            <TouchableOpacity style={styles.monthNavBtn} onPress={handleNextMonth} activeOpacity={0.7}>
              <Text style={styles.monthNavBtnText}>{nextMonthName}</Text>
              <MaterialCommunityIcons name="menu-right" size={20} color={palette.ink} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 6 Summary Metric Cards (Horizontally Scrollable) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsCardsRow}
        >
          {/* 1. Present */}
          <Card style={styles.statCard} mode="elevated">
            <Card.Content style={styles.statCardContent}>
              <Text style={[styles.statNumber, { color: '#16A34A' }]}>{stats.present}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </Card.Content>
          </Card>

          {/* 2. Absent */}
          <Card style={styles.statCard} mode="elevated">
            <Card.Content style={styles.statCardContent}>
              <Text style={[styles.statNumber, { color: '#DC2626' }]}>{stats.absent}</Text>
              <Text style={styles.statLabel}>Absent</Text>
            </Card.Content>
          </Card>

          {/* 3. Late */}
          <Card style={styles.statCard} mode="elevated">
            <Card.Content style={styles.statCardContent}>
              <Text style={[styles.statNumber, { color: '#D97706' }]}>{stats.late}</Text>
              <Text style={styles.statLabel}>Late</Text>
            </Card.Content>
          </Card>

          {/* 4. Total Hours */}
          <Card style={styles.statCard} mode="elevated">
            <Card.Content style={styles.statCardContent}>
              <Text style={[styles.statNumber, { color: '#2563EB' }]}>{stats.totalHours}</Text>
              <Text style={styles.statLabel}>Total Hours</Text>
            </Card.Content>
          </Card>

          {/* 5. Avg Daily */}
          <Card style={styles.statCard} mode="elevated">
            <Card.Content style={styles.statCardContent}>
              <Text style={[styles.statNumber, { color: '#0F172A' }]}>{stats.avgDaily}</Text>
              <Text style={styles.statLabel}>Avg Daily</Text>
            </Card.Content>
          </Card>

          {/* 6. Auto Checkout */}
          <Card style={styles.statCard} mode="elevated">
            <Card.Content style={styles.statCardContent}>
              <Text style={[styles.statNumber, { color: '#7C3AED' }]}>{stats.autoCheckout}</Text>
              <Text style={styles.statLabel}>Auto Checkout</Text>
            </Card.Content>
          </Card>
        </ScrollView>

        {/* Tab Selection Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'calendar' && styles.tabItemActive]}
            onPress={() => setActiveTab('calendar')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabItemText, activeTab === 'calendar' && styles.tabItemTextActive]}>
              Calendar View
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'log' && styles.tabItemActive]}
            onPress={() => setActiveTab('log')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabItemText, activeTab === 'log' && styles.tabItemTextActive]}>
              Attendance Log
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'detail' && styles.tabItemActive]}
            onPress={() => setActiveTab('detail')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabItemText, activeTab === 'detail' && styles.tabItemTextActive]}>
              {inspectedShortLabel}
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: CALENDAR VIEW */}
        {activeTab === 'calendar' && (
          <Card style={styles.calendarCard} mode="outlined">
            <Card.Content style={{ padding: 12 }}>
              {/* Day of Week Headers */}
              <View style={styles.weekHeaderRow}>
                {WEEKDAY_HEADERS.map((h, i) => (
                  <View key={h} style={styles.weekHeaderCell}>
                    <Text style={[styles.weekHeaderText, (i === 5 || i === 6) && { color: '#94A3B8' }]}>
                      {h}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Calendar Grid Cells */}
              <View style={styles.calendarGrid}>
                {calendarDays.map((item, idx) => {
                  if (item.statusType === 'EMPTY') {
                    return <View key={`empty-${idx}`} style={styles.dayCellEmpty} />;
                  }

                  const isSelected = item.dateStr === inspectedDay;

                  // Visual style based on status
                  let cellBg: string = '#FFFFFF';
                  let cellBorder: string = '#E2E8F0';
                  let textColor: string = palette.ink;
                  let subColor: string = '#64748B';

                  if (item.statusType === 'PRESENT') {
                    cellBg = '#F0FDF4';
                    cellBorder = '#BBF7D0';
                    textColor = '#166534';
                    subColor = '#15803D';
                  } else if (item.statusType === 'LATE') {
                    cellBg = '#FEF3C7';
                    cellBorder = '#FDE68A';
                    textColor = '#92400E';
                    subColor = '#B45309';
                  } else if (item.statusType === 'ABSENT') {
                    cellBg = '#FEE2E2';
                    cellBorder = '#FECACA';
                    textColor = '#991B1B';
                    subColor = '#DC2626';
                  } else if (item.statusType === 'AUTO_CHECKOUT') {
                    cellBg = '#F5F3FF';
                    cellBorder = '#DDD6FE';
                    textColor = '#6D28D9';
                    subColor = '#7C3AED';
                  } else if (item.statusType === 'WEEKEND') {
                    cellBg = '#F8FAFC';
                    cellBorder = '#F1F5F9';
                    textColor = '#94A3B8';
                    subColor = '#CBD5E1';
                  } else {
                    cellBg = '#FFFFFF';
                    cellBorder = '#F1F5F9';
                    textColor = '#94A3B8';
                  }

                  return (
                    <TouchableOpacity
                      key={item.dateStr}
                      style={[
                        styles.dayCell,
                        {
                          backgroundColor: cellBg,
                          borderColor: isSelected ? palette.primary : cellBorder,
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                      onPress={() => handleDayPress(item.dateStr)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.dayCellNum, { color: textColor }]}>
                        {item.dayNum}
                      </Text>
                      {item.subtext ? (
                        <Text style={[styles.dayCellSub, { color: subColor }]} numberOfLines={1}>
                          {item.subtext}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Bottom Legend */}
              <View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]} />
                  <Text style={styles.legendLabel}>Working/Present</Text>
                </View>

                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]} />
                  <Text style={styles.legendLabel}>Late</Text>
                </View>

                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]} />
                  <Text style={styles.legendLabel}>Absent</Text>
                </View>

                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, { backgroundColor: '#F3E8FF', borderColor: '#DDD6FE' }]} />
                  <Text style={styles.legendLabel}>Auto Checkout</Text>
                </View>

                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]} />
                  <Text style={styles.legendLabel}>Weekend</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* TAB 2: ATTENDANCE LOG */}
        {activeTab === 'log' && (
          <View style={styles.logContainer}>
            {loading ? (
              <LoadingIndicator message="Retrieving attendance log..." />
            ) : sessions.length === 0 ? (
              <Card style={styles.emptyCard} mode="outlined">
                <Card.Content style={{ alignItems: 'center', padding: 24 }}>
                  <MaterialCommunityIcons name="calendar-blank-outline" size={40} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>No Attendance Records</Text>
                  <Text style={styles.emptySubtitle}>No sessions found for {monthTitle}.</Text>
                </Card.Content>
              </Card>
            ) : (
              sessions.map((item) => {
                const isWorking = item.status === 'WORKING';
                const isLate = item.checkInStatus === 'LATE';
                const isAuto = item.status === 'AUTO_CHECKED_OUT' || item.checkoutType === 'AUTO_MIDNIGHT';
                const dateOnly = item.attendanceDate ? String(item.attendanceDate).slice(0, 10) : '—';

                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                      setInspectedDay(dateOnly);
                      setActiveTab('detail');
                    }}
                    activeOpacity={0.8}
                  >
                    <Card style={styles.logCard} mode="outlined">
                      <Card.Content style={{ padding: 14 }}>
                        <View style={styles.logCardHeader}>
                          <View>
                            <Text style={styles.logCardDate}>{dateOnly}</Text>
                            <Text style={styles.logCardOffice}>
                              {(item as any).officeName || (item.officeId && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(item.officeId) ? `Office: ${item.officeId}` : 'Assigned Workplace')}
                            </Text>
                          </View>

                          <AttendanceStatusBadge status={item.status} isLate={isLate} />
                        </View>

                        <Divider style={{ marginVertical: 10 }} />

                        <View style={styles.logMetricsGrid}>
                          <View style={styles.logMetricCol}>
                            <Text style={styles.logMetricLabel}>Check-In</Text>
                            <Text style={styles.logMetricVal}>{formatTimeToHhMm(item.checkInAt)}</Text>
                          </View>
                          <View style={styles.logMetricCol}>
                            <Text style={styles.logMetricLabel}>Check-Out</Text>
                            <Text style={styles.logMetricVal}>{formatTimeToHhMm(item.checkOutAt)}</Text>
                          </View>
                          <View style={styles.logMetricCol}>
                            <Text style={styles.logMetricLabel}>Total Worked</Text>
                            <Text style={[styles.logMetricVal, { color: palette.primary }]}>
                              {formatDuration(item.totalWorkingSeconds)}
                            </Text>
                          </View>
                        </View>

                        {Boolean(item.hasSpecialCondition || (item.specialConditionSeconds && item.specialConditionSeconds > 0)) && (
                          <View style={styles.specialHoursBadgeWrap}>
                            <Text style={styles.specialHoursBadgeText}>
                              +{formatDuration(item.specialConditionSeconds || 0)} Special Condition (HR Approved)
                            </Text>
                          </View>
                        )}
                      </Card.Content>
                    </Card>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* TAB 3: DAY DETAIL */}
        {activeTab === 'detail' && (
          <Card style={styles.detailCard} mode="elevated">
            <Card.Content style={{ padding: 18 }}>
              <View style={styles.detailHeaderRow}>
                <View>
                  <Text style={styles.detailDateTitle}>{inspectedDay}</Text>
                  <Text style={styles.detailSubtitle}>Daily Attendance Inspection</Text>
                </View>

                <AttendanceStatusBadge
                  status={primaryInspectedSession?.status}
                  isLate={primaryInspectedSession?.checkInStatus === 'LATE'}
                />
              </View>

              <Divider style={{ marginVertical: 14 }} />

              {primaryInspectedSession ? (
                <View>
                  <View style={styles.detailGrid}>
                    <View style={styles.detailBox}>
                      <MaterialCommunityIcons name="login" size={20} color="#16A34A" />
                      <Text style={styles.detailBoxLabel}>Check-In Time</Text>
                      <Text style={styles.detailBoxVal}>{formatTimeToHhMm(primaryInspectedSession.checkInAt)}</Text>
                      <Text style={styles.detailBoxSub}>
                        {primaryInspectedSession.checkInStatus === 'LATE' ? 'Flagged: Late arrival' : 'On-time arrival'}
                      </Text>
                    </View>

                    <View style={styles.detailBox}>
                      <MaterialCommunityIcons name="logout" size={20} color="#DC2626" />
                      <Text style={styles.detailBoxLabel}>Check-Out Time</Text>
                      <Text style={styles.detailBoxVal}>{formatTimeToHhMm(primaryInspectedSession.checkOutAt)}</Text>
                      <Text style={styles.detailBoxSub}>
                        {primaryInspectedSession.status === 'AUTO_CHECKED_OUT' ? 'Auto-closed at midnight' : 'Regular checkout'}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.detailBox, { marginTop: 12, alignItems: 'flex-start' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MaterialCommunityIcons name="clock-outline" size={20} color={palette.primary} />
                      <Text style={styles.detailBoxLabel}>Working Time Breakdown</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8 }}>
                      <Text style={{ fontSize: 13, color: '#475569' }}>Total Duration:</Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: palette.primary }}>
                        {formatDuration(primaryInspectedSession.totalWorkingSeconds)}
                      </Text>
                    </View>
                    {Boolean(primaryInspectedSession.totalPausedSeconds) && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 4 }}>
                        <Text style={{ fontSize: 13, color: '#475569' }}>Pause / Outside Office:</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#D97706' }}>
                          {formatDuration(primaryInspectedSession.totalPausedSeconds!)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {Boolean(
                    primaryInspectedSession.hasSpecialCondition ||
                      (primaryInspectedSession.specialConditionSeconds && primaryInspectedSession.specialConditionSeconds > 0),
                  ) && (
                    <View style={styles.specialDetailCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <MaterialCommunityIcons name="clock-plus" size={20} color="#7C3AED" />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#6D28D9' }}>
                          Approved Special Hours: +{formatDuration(primaryInspectedSession.specialConditionSeconds || 0)}
                        </Text>
                      </View>
                      {Boolean(primaryInspectedSession.specialConditionReason) && (
                        <Text style={{ fontSize: 12, color: '#4B5563', fontStyle: 'italic', marginTop: 4 }}>
                          "{primaryInspectedSession.specialConditionReason}"
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <MaterialCommunityIcons name="calendar-remove-outline" size={44} color="#94A3B8" />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: palette.ink, marginTop: 10 }}>
                    No Attendance Logged
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4 }}>
                    No check-in session recorded on {inspectedDay}. If you had a genuine situation, you can submit a special hours request to HR.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.backToCalendarBtn}
                onPress={() => setActiveTab('calendar')}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="calendar-month-outline" size={18} color={palette.primary} />
                <Text style={styles.backToCalendarBtnText}>Back to Calendar View</Text>
              </TouchableOpacity>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 10,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  pageSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  monthNavGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  monthNavBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.ink,
  },
  monthNavLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.ink,
    marginHorizontal: 4,
  },
  statsCardsRow: {
    gap: 10,
    paddingBottom: 4,
    marginBottom: 16,
  },
  statCard: {
    width: 105,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statCardContent: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 16,
    gap: 20,
  },
  tabItem: {
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: palette.primary,
  },
  tabItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabItemTextActive: {
    color: palette.primary,
    fontWeight: '700',
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderColor: '#E2E8F0',
  },
  weekHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellEmpty: {
    width: '14.28%',
    aspectRatio: 1.15,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1.15,
    borderRadius: 8,
    marginVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayCellNum: {
    fontSize: 12,
    fontWeight: '700',
  },
  dayCellSub: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 16,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 1,
  },
  legendLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  logContainer: {
    gap: 10,
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderColor: '#E2E8F0',
  },
  logCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logCardDate: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.ink,
  },
  logCardOffice: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  logBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lateBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lateBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
    letterSpacing: 0.3,
  },
  statusBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.3,
  },
  statusBadgeWorking: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  statusBadgeTextWorking: {
    color: '#15803D',
  },
  statusBadgePaused: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  statusBadgeTextPaused: {
    color: '#B45309',
  },
  statusBadgeAuto: {
    backgroundColor: '#F3E8FF',
    borderColor: '#DDD6FE',
  },
  statusBadgeTextAuto: {
    color: '#6D28D9',
  },
  absentBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  absentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: 0.3,
  },
  logMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logMetricCol: {
    flex: 1,
  },
  logMetricLabel: {
    fontSize: 11,
    color: palette.subtle,
    marginBottom: 2,
  },
  logMetricVal: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.ink,
  },
  specialHoursBadgeWrap: {
    marginTop: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#F5F3FF',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  specialHoursBadgeText: {
    fontSize: 11,
    color: '#6D28D9',
    fontWeight: '700',
  },
  detailCard: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    elevation: 2,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailDateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
  },
  detailSubtitle: {
    fontSize: 12,
    color: palette.muted,
    marginTop: 2,
  },
  detailGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  detailBox: {
    flex: 1,
    backgroundColor: palette.background,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  detailBoxLabel: {
    fontSize: 11,
    color: palette.muted,
    fontWeight: '600',
    marginTop: 6,
  },
  detailBoxVal: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.ink,
    marginTop: 2,
  },
  detailBoxSub: {
    fontSize: 10,
    color: palette.subtle,
    marginTop: 2,
  },
  specialDetailCard: {
    marginTop: 12,
    backgroundColor: '#F5F3FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    padding: 12,
  },
  backToCalendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: palette.primaryLight,
    gap: 6,
  },
  backToCalendarBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.primary,
  },
  emptyCard: {
    backgroundColor: palette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.ink,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: palette.muted,
    marginTop: 2,
  },
});
