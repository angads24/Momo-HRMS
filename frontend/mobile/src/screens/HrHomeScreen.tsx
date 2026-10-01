import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { palette } from '../theme/theme';
import GpsLocationInspector from '../components/GpsLocationInspector';
import { listEmployees, toggleEmployeeStatus } from '../api/employeeApi';
import type { Employee } from '../api/employeeApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = 'employees' | 'dashboard' | 'profile';

// ─── Employee Detail Modal ────────────────────────────────────────────────────

interface EmployeeDetailProps {
  employee: Employee | null;
  onClose: () => void;
  onStatusChange: (id: string, isActive: boolean) => void;
}

function EmployeeDetail({ employee, onClose, onStatusChange }: EmployeeDetailProps) {
  const [toggling, setToggling] = useState(false);

  if (!employee) return null;

  const handleToggle = async () => {
    const newStatus = !employee.isActive;
    Alert.alert(
      newStatus ? 'Activate Employee' : 'Deactivate Employee',
      `Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} ${employee.fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newStatus ? 'Activate' : 'Deactivate',
          style: newStatus ? 'default' : 'destructive',
          onPress: async () => {
            try {
              setToggling(true);
              await toggleEmployeeStatus(employee.id, newStatus);
              onStatusChange(employee.id, newStatus);
              Alert.alert('Success', `Employee ${newStatus ? 'activated' : 'deactivated'} successfully.`);
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message ?? e?.message ?? 'Failed to update status');
            } finally {
              setToggling(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={detailStyles.overlay}>
      <View style={detailStyles.modal}>
        <View style={detailStyles.header}>
          <TouchableOpacity onPress={onClose} style={detailStyles.closeBtn}>
            <MaterialCommunityIcons name="close" size={20} color={palette.inkSecondary} />
          </TouchableOpacity>
          <Text style={detailStyles.title}>Employee Profile</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={detailStyles.avatarRow}>
          <View style={[detailStyles.avatar, { backgroundColor: employee.isActive ? palette.primary + '33' : palette.muted + '22' }]}>
            <Text style={[detailStyles.avatarText, { color: employee.isActive ? palette.primary : palette.muted }]}>
              {employee.fullName[0].toUpperCase()}
            </Text>
          </View>
          <Text style={detailStyles.name}>{employee.fullName}</Text>
          <View style={[detailStyles.statusBadge, { backgroundColor: employee.isActive ? palette.success + '22' : palette.error + '22' }]}>
            <View style={[detailStyles.statusDot, { backgroundColor: employee.isActive ? palette.success : palette.error }]} />
            <Text style={[detailStyles.statusText, { color: employee.isActive ? palette.success : palette.error }]}>
              {employee.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <ScrollView style={detailStyles.body} showsVerticalScrollIndicator={false}>
          {[
            { icon: 'badge-account', label: 'Employee Code', value: employee.employeeCode },
            { icon: 'email', label: 'Email', value: employee.email },
            { icon: 'phone', label: 'Phone', value: employee.phone ?? '—' },
            { icon: 'domain', label: 'Department', value: employee.department ?? '—' },
            { icon: 'briefcase', label: 'Job Title', value: employee.jobTitle ?? '—' },
            { icon: 'calendar', label: 'Hire Date', value: formatDate(employee.hireDate) },
          ].map((row, i) => (
            <View key={i} style={detailStyles.infoRow}>
              <MaterialCommunityIcons name={row.icon as any} size={16} color={palette.primary} />
              <View>
                <Text style={detailStyles.infoLabel}>{row.label}</Text>
                <Text style={detailStyles.infoValue}>{row.value}</Text>
              </View>
            </View>
          ))}

          {employee.assignments && employee.assignments.length > 0 && (
            <View style={detailStyles.officesBox}>
              <Text style={detailStyles.officesTitle}>Office Assignments</Text>
              {employee.assignments.filter((a) => a.isActive).map((a) => (
                <View key={a.id} style={detailStyles.officeRow}>
                  <MaterialCommunityIcons name="office-building" size={14} color={palette.accent} />
                  <Text style={detailStyles.officeName}>{a.officeName ?? a.officeId}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Toggle Status */}
        <TouchableOpacity
          style={[detailStyles.toggleBtn, employee.isActive ? detailStyles.deactivateBtn : detailStyles.activateBtn, toggling && { opacity: 0.6 }]}
          onPress={handleToggle}
          disabled={toggling}
        >
          {toggling ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name={employee.isActive ? 'account-off' : 'account-check'} size={18} color="#fff" />
              <Text style={detailStyles.toggleBtnText}>
                {employee.isActive ? 'Deactivate Employee' : 'Activate Employee'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end', zIndex: 100 },
  modal: { backgroundColor: palette.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingTop: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
  title: { color: palette.ink, fontSize: 16, fontWeight: '700' },
  avatarRow: { alignItems: 'center', paddingHorizontal: 20, marginBottom: 20, gap: 8 },
  avatar: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 28, fontWeight: '700' },
  name: { color: palette.ink, fontSize: 18, fontWeight: '700' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  body: { paddingHorizontal: 20, maxHeight: 300 },
  infoRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: palette.border },
  infoLabel: { color: palette.muted, fontSize: 11, textTransform: 'uppercase', marginBottom: 2 },
  infoValue: { color: palette.ink, fontSize: 14, fontWeight: '500' },
  officesBox: { marginTop: 16, backgroundColor: palette.surfaceElevated, borderRadius: 12, padding: 14, gap: 8 },
  officesTitle: { color: palette.inkSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  officeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  officeName: { color: palette.ink, fontSize: 13 },
  toggleBtn: { flexDirection: 'row', gap: 10, margin: 20, paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  deactivateBtn: { backgroundColor: palette.error },
  activateBtn: { backgroundColor: palette.success },
  toggleBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ─── HR Home Screen ───────────────────────────────────────────────────────────

export default function HrHomeScreen() {
  const { user, logout } = useAuth();
  const [activeScreen, setActiveScreen] = useState<Screen>('dashboard');

  // Employees
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Stats
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    if (activeScreen === 'employees') void loadEmployees();
    if (activeScreen === 'dashboard') void loadStats();
  }, [activeScreen]);

  const loadEmployees = async (searchTerm?: string, activeFilter?: boolean) => {
    try {
      setLoadingEmployees(true);
      const result = await listEmployees({
        page: 1,
        limit: 50,
        search: searchTerm,
        isActive: activeFilter,
      });
      setEmployees(Array.isArray(result?.items) ? result.items : []);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Failed to load employees');
    } finally {
      setLoadingEmployees(false);
    }
  };

  const loadStats = async () => {
    try {
      const all = await listEmployees({ limit: 1 });
      setTotalEmployees(all.total);
      const active = await listEmployees({ limit: 1, isActive: true });
      setActiveCount(active.total);
    } catch {
      // silent
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeScreen === 'employees') await loadEmployees(search, filterActive);
    if (activeScreen === 'dashboard') await loadStats();
    setRefreshing(false);
  }, [activeScreen, search, filterActive]);

  const handleSearch = (text: string) => {
    setSearch(text);
    if (text.length > 1 || text.length === 0) {
      void loadEmployees(text || undefined, filterActive);
    }
  };

  const handleFilter = (val: boolean | undefined) => {
    setFilterActive(val);
    void loadEmployees(search || undefined, val);
  };

  const handleStatusChange = (id: string, isActive: boolean) => {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, isActive } : e)));
    if (selectedEmployee?.id === id) {
      setSelectedEmployee((prev) => prev ? { ...prev, isActive } : null);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const renderDashboard = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.greetingRow}>
        <View>
          <Text style={styles.greeting}>HR Dashboard 👔</Text>
          <Text style={styles.greetingName}>{user?.fullName ?? user?.username}</Text>
        </View>
        <TouchableOpacity onPress={() => void logout()} style={styles.logoutBtn}>
          <MaterialCommunityIcons name="logout" size={20} color={palette.muted} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderColor: palette.primary + '44' }]}>
          <Text style={styles.statValue}>{totalEmployees}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { borderColor: palette.success + '44' }]}>
          <Text style={[styles.statValue, { color: palette.success }]}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statCard, { borderColor: palette.error + '44' }]}>
          <Text style={[styles.statValue, { color: palette.error }]}>{totalEmployees - activeCount}</Text>
          <Text style={styles.statLabel}>Inactive</Text>
        </View>
      </View>

      {/* GPS Location & Geofence Inspector */}
      <GpsLocationInspector />

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickActionCard} onPress={() => setActiveScreen('employees')}>
          <MaterialCommunityIcons name="account-group" size={28} color={palette.primary} />
          <Text style={styles.quickActionLabel}>Manage Employees</Text>
        </TouchableOpacity>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <MaterialCommunityIcons name="information-outline" size={20} color={palette.info} />
        <Text style={styles.infoText}>
          As HR, you can view employee profiles and activate or deactivate employees. Contact Admin for permanent deletion or HR Admin creation.
        </Text>
      </View>
    </ScrollView>
  );

  const renderEmployees = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={20} color={palette.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search employees..."
          placeholderTextColor={palette.muted}
          value={search}
          onChangeText={handleSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <MaterialCommunityIcons name="close-circle" size={18} color={palette.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {[
          { label: 'All', value: undefined },
          { label: 'Active', value: true },
          { label: 'Inactive', value: false },
        ].map((f) => (
          <TouchableOpacity
            key={String(f.value)}
            style={[styles.filterChip, filterActive === f.value && styles.filterChipActive]}
            onPress={() => handleFilter(f.value)}
          >
            <Text style={[styles.filterChipText, filterActive === f.value && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loadingEmployees ? (
        <ActivityIndicator color={palette.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {employees.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="account-search" size={48} color={palette.muted} />
              <Text style={styles.emptyText}>No employees found</Text>
            </View>
          ) : (
            employees.map((emp) => (
              <TouchableOpacity
                key={emp.id}
                style={styles.employeeCard}
                onPress={() => setSelectedEmployee(emp)}
              >
                <View style={[styles.empAvatar, { backgroundColor: emp.isActive ? palette.primary + '22' : palette.muted + '18' }]}>
                  <Text style={[styles.empAvatarText, { color: emp.isActive ? palette.primary : palette.muted }]}>
                    {emp.fullName[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.empName}>{emp.fullName}</Text>
                  <Text style={styles.empMeta}>{emp.employeeCode} {emp.department ? `• ${emp.department}` : ''}</Text>
                </View>
                <View style={[styles.empStatusDot, { backgroundColor: emp.isActive ? palette.success : palette.error }]} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );

  const renderProfile = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>My Profile</Text>
      </View>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>{(user?.fullName ?? user?.username ?? '?')[0].toUpperCase()}</Text>
      </View>
      <View style={styles.profileCard}>
        {[
          { icon: 'account', label: 'Full Name', value: user?.fullName ?? '—' },
          { icon: 'email', label: 'Email', value: user?.email ?? '—' },
          { icon: 'shield-account', label: 'Role', value: 'HR Admin' },
        ].map((row, i) => (
          <View key={i}>
            {i > 0 && <View style={styles.profileDivider} />}
            <View style={styles.profileRow}>
              <MaterialCommunityIcons name={row.icon as any} size={18} color={palette.primary} />
              <View>
                <Text style={styles.profileLabel}>{row.label}</Text>
                <Text style={styles.profileValue}>{row.value}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
      <TouchableOpacity style={styles.logoutFullBtn} onPress={() => void logout()}>
        <MaterialCommunityIcons name="logout" size={18} color={palette.error} />
        <Text style={styles.logoutFullBtnText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Employee Detail Sheet */}
      {selectedEmployee && (
        <EmployeeDetail
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Screen Header for Employees */}
      {activeScreen === 'employees' && (
        <View style={styles.screenTopBar}>
          <Text style={styles.screenTitle}>Employees</Text>
          <TouchableOpacity onPress={() => void logout()} style={styles.logoutBtn}>
            <MaterialCommunityIcons name="logout" size={20} color={palette.muted} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.content}>
        {activeScreen === 'dashboard' && renderDashboard()}
        {activeScreen === 'employees' && renderEmployees()}
        {activeScreen === 'profile' && renderProfile()}
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {(
          [
            { key: 'dashboard', icon: 'view-dashboard', label: 'Dashboard' },
            { key: 'employees', icon: 'account-group', label: 'Employees' },
            { key: 'profile', icon: 'account-circle', label: 'Profile' },
          ] as const
        ).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => setActiveScreen(tab.key)}
          >
            <MaterialCommunityIcons
              name={tab.icon as any}
              size={24}
              color={activeScreen === tab.key ? palette.primary : palette.muted}
            />
            <Text style={[styles.tabLabel, activeScreen === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  content: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  greeting: { color: palette.inkSecondary, fontSize: 14 },
  greetingName: { color: palette.ink, fontSize: 22, fontWeight: '700', marginTop: 2 },
  logoutBtn: { padding: 8, backgroundColor: palette.card, borderRadius: 10 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: palette.card, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1 },
  statValue: { color: palette.primary, fontSize: 28, fontWeight: '800' },
  statLabel: { color: palette.muted, fontSize: 11, marginTop: 4, textTransform: 'uppercase' },

  sectionTitle: { color: palette.inkSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },

  // Quick Actions
  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  quickActionCard: { flex: 1, backgroundColor: palette.card, borderRadius: 16, padding: 20, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: palette.border },
  quickActionLabel: { color: palette.ink, fontSize: 13, fontWeight: '600', textAlign: 'center' },

  // Info
  infoCard: { flexDirection: 'row', gap: 12, backgroundColor: palette.info + '10', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: palette.info + '30', alignItems: 'flex-start' },
  infoText: { flex: 1, color: palette.inkSecondary, fontSize: 13, lineHeight: 19 },

  // Search
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, marginBottom: 0, backgroundColor: palette.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: palette.border },
  searchInput: { flex: 1, color: palette.ink, fontSize: 15 },

  // Filters
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border },
  filterChipActive: { backgroundColor: palette.primary + '22', borderColor: palette.primary },
  filterChipText: { color: palette.muted, fontSize: 13 },
  filterChipTextActive: { color: palette.primary, fontWeight: '600' },

  // Employee Card
  employeeCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: palette.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: palette.border },
  empAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  empAvatarText: { fontSize: 18, fontWeight: '700' },
  empName: { color: palette.ink, fontSize: 15, fontWeight: '600' },
  empMeta: { color: palette.muted, fontSize: 12, marginTop: 2 },
  empStatusDot: { width: 9, height: 9, borderRadius: 5 },

  // Empty
  emptyState: { alignItems: 'center', gap: 12, marginTop: 60 },
  emptyText: { color: palette.muted, fontSize: 15 },

  // Profile
  screenTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  screenHeader: { marginBottom: 20 },
  screenTitle: { color: palette.ink, fontSize: 22, fontWeight: '700' },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: palette.primary + '33', borderWidth: 2, borderColor: palette.primary, alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  avatarText: { fontSize: 32, fontWeight: '700', color: palette.primary },
  profileCard: { backgroundColor: palette.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: palette.border },
  profileRow: { flexDirection: 'row', gap: 14, paddingVertical: 12, alignItems: 'flex-start' },
  profileDivider: { height: 1, backgroundColor: palette.border, marginHorizontal: -16 },
  profileLabel: { color: palette.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  profileValue: { color: palette.ink, fontSize: 15, fontWeight: '500' },
  logoutFullBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 24, paddingVertical: 16, backgroundColor: palette.error + '15', borderRadius: 14, borderWidth: 1, borderColor: palette.error + '33' },
  logoutFullBtnText: { color: palette.error, fontSize: 16, fontWeight: '600' },

  // Tab Bar
  tabBar: { flexDirection: 'row', backgroundColor: palette.surface, borderTopWidth: 1, borderTopColor: palette.border, paddingBottom: 8, paddingTop: 8 },
  tabItem: { flex: 1, alignItems: 'center', gap: 4 },
  tabLabel: { fontSize: 11, color: palette.muted },
  tabLabelActive: { color: palette.primary, fontWeight: '600' },
});
