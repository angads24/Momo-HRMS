import { useState, useEffect, type ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Popover from '@mui/material/Popover';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

// Icons
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RuleIcon from '@mui/icons-material/Rule';
import BarChartIcon from '@mui/icons-material/BarChart';
import SecurityIcon from '@mui/icons-material/Security';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LanIcon from '@mui/icons-material/Lan';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

import { COMPANY_NAME } from '../config/env';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../utils/roles';
import { NotificationBell } from './NotificationBell';

interface Props {
  activeTab: number;
  onTabChange: (newTab: number) => void;
  children: ReactNode;
  onQuickAction?: (actionKey: string) => void;
}

interface NavItem {
  id: number;
  label: string;
  icon: typeof DashboardIcon;
  badge?: string;
  category: 'OPERATIONS' | 'INTELLIGENCE';
}

export function DashboardLayout({ activeTab, onTabChange, children, onQuickAction }: Props) {
  const { user, logout, notice, clearNotice } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Command Palette State (Ctrl+K)
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Action Menu State
  const [actionAnchor, setActionAnchor] = useState<null | HTMLElement>(null);

  // Services Mesh Popover State
  const [servicesAnchor, setServicesAnchor] = useState<null | HTMLElement>(null);

  // Keyboard shortcut listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  const navItems: NavItem[] = [
    { id: 0, label: 'Executive Overview', icon: DashboardIcon, category: 'OPERATIONS' },
    { id: 1, label: 'Employee Directory', icon: PeopleIcon, category: 'OPERATIONS' },
    { id: 2, label: 'Offices & Geofences', icon: LocationOnIcon, category: 'OPERATIONS' },
    { id: 3, label: 'Live Attendance Radar', icon: AccessTimeIcon, badge: 'LIVE', category: 'OPERATIONS' },
    { id: 4, label: 'Approvals & Exceptions', icon: RuleIcon, badge: '2', category: 'OPERATIONS' },
    { id: 5, label: 'Workforce Analytics', icon: BarChartIcon, category: 'INTELLIGENCE' },
    { id: 6, label: 'Security & Audit Trail', icon: SecurityIcon, category: 'INTELLIGENCE' },
  ];

  const microservices = [
    { name: 'API Gateway', port: 8000, status: 'ONLINE', latency: '4ms' },
    { name: 'Auth Service', port: 3001, status: 'ONLINE', latency: '12ms' },
    { name: 'Attendance Service', port: 3002, status: 'ONLINE', latency: '15ms' },
    { name: 'Geofence Service', port: 3003, status: 'ONLINE', latency: '8ms' },
    { name: 'Employee Service', port: 3004, status: 'ONLINE', latency: '11ms' },
    { name: 'Notification Service', port: 3005, status: 'ONLINE', latency: '19ms' },
    { name: 'Face AI Service', port: 3006, status: 'ONLINE', latency: '42ms' },
  ];

  const filteredPaletteItems = navItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: '#F8FAFC' }}>
      {/* Sleek Enterprise Collapsible Sidebar */}
      <Box
        component="aside"
        sx={{
          width: sidebarCollapsed ? 76 : 260,
          bgcolor: '#FFFFFF',
          color: '#1F2937',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          borderRight: '1px solid #FED7AA',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 1200,
          overflowX: 'hidden',
          boxShadow: '2px 0 16px rgba(255, 107, 53, 0.04)',
        }}
      >
        {/* Top Branding */}
        <Box sx={{ p: 2.5, borderBottom: '1px solid #FFF7ED' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2.5,
                  background: 'linear-gradient(135deg, #FF6B35 0%, #FFA043 100%)',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 900,
                  fontSize: 20,
                  color: '#FFFFFF',
                  boxShadow: '0 4px 14px rgba(255, 107, 53, 0.35)',
                  flexShrink: 0,
                }}
              >
                M
              </Box>
              {!sidebarCollapsed && (
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.1, color: '#1F2937' }}>
                    {COMPANY_NAME}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.4 }}>
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#FF6B35' }} />
                    <Typography variant="caption" sx={{ color: '#EA580C', fontSize: 11, fontWeight: 700 }}>
                      v2.4 Enterprise
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>

            {!sidebarCollapsed && (
              <IconButton
                size="small"
                onClick={() => setSidebarCollapsed(true)}
                sx={{ color: '#94A3B8', '&:hover': { color: '#FFFFFF', bgcolor: 'rgba(255,255,255,0.06)' } }}
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
            )}
          </Box>

          {sidebarCollapsed && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
              <IconButton
                size="small"
                onClick={() => setSidebarCollapsed(false)}
                sx={{ color: '#94A3B8', '&:hover': { color: '#FFFFFF', bgcolor: 'rgba(255,255,255,0.06)' } }}
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
        </Box>

        {/* Navigation Items List */}
        <Box sx={{ flexGrow: 1, px: 1.5, py: 1, overflowY: 'auto' }}>
          {/* Operations Section */}
          {!sidebarCollapsed && (
            <Typography variant="caption" sx={{ px: 1.5, py: 0.8, color: '#64748B', fontWeight: 800, fontSize: 10, letterSpacing: 0.8, display: 'block' }}>
              WORKFORCE OPERATIONS
            </Typography>
          )}

          {navItems
            .filter((item) => item.category === 'OPERATIONS')
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <Tooltip key={item.id} title={sidebarCollapsed ? item.label : ''} placement="right">
                  <Button
                    fullWidth
                    onClick={() => onTabChange(item.id)}
                    sx={{
                      justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                      px: sidebarCollapsed ? 1 : 1.8,
                      py: 1.2,
                      mb: 0.6,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: isActive ? 700 : 600,
                      fontSize: 13.5,
                      color: isActive ? '#FFFFFF' : '#4B5563',
                      background: isActive ? 'linear-gradient(135deg, #FF6B35 0%, #FFA043 100%)' : 'transparent',
                      boxShadow: isActive ? '0 4px 14px rgba(255, 107, 53, 0.35)' : 'none',
                      '&:hover': {
                        background: isActive ? 'linear-gradient(135deg, #E8551E 0%, #FF8A00 100%)' : '#FFF7ED',
                        color: isActive ? '#FFFFFF' : '#FF6B35',
                      },
                    }}
                  >
                    <Icon sx={{ fontSize: 20, mr: sidebarCollapsed ? 0 : 1.5, color: isActive ? '#FFFFFF' : '#9CA3AF' }} />
                    {!sidebarCollapsed && (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span>{item.label}</span>
                        {item.badge && (
                          <Chip
                            label={item.badge}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: 10,
                              fontWeight: 800,
                              bgcolor: item.badge === 'LIVE' ? '#EF4444' : '#FF8A00',
                              color: '#FFFFFF',
                            }}
                          />
                        )}
                      </Box>
                    )}
                  </Button>
                </Tooltip>
              );
            })}

          {/* Intelligence Section */}
          {!sidebarCollapsed && (
            <Typography variant="caption" sx={{ px: 1.5, pt: 2, pb: 0.8, color: '#9CA3AF', fontWeight: 800, fontSize: 10, letterSpacing: 0.8, display: 'block' }}>
              INSIGHTS & AUDIT
            </Typography>
          )}

          {navItems
            .filter((item) => item.category === 'INTELLIGENCE')
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <Tooltip key={item.id} title={sidebarCollapsed ? item.label : ''} placement="right">
                  <Button
                    fullWidth
                    onClick={() => onTabChange(item.id)}
                    sx={{
                      justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                      px: sidebarCollapsed ? 1 : 1.8,
                      py: 1.2,
                      mb: 0.6,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: isActive ? 700 : 600,
                      fontSize: 13.5,
                      color: isActive ? '#FFFFFF' : '#4B5563',
                      background: isActive ? 'linear-gradient(135deg, #FF6B35 0%, #FFA043 100%)' : 'transparent',
                      boxShadow: isActive ? '0 4px 14px rgba(255, 107, 53, 0.35)' : 'none',
                      '&:hover': {
                        background: isActive ? 'linear-gradient(135deg, #E8551E 0%, #FF8A00 100%)' : '#FFF7ED',
                        color: isActive ? '#FFFFFF' : '#FF6B35',
                      },
                    }}
                  >
                    <Icon sx={{ fontSize: 20, mr: sidebarCollapsed ? 0 : 1.5, color: isActive ? '#FFFFFF' : '#9CA3AF' }} />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </Button>
                </Tooltip>
              );
            })}
        </Box>

        {/* User Card & Logout Bottom */}
        <Box sx={{ p: 2, borderTop: '1px solid #FED7AA', bgcolor: '#FFFBF7' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden' }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FF6B35 0%, #FFA043 100%)',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: 14,
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: '0 2px 8px rgba(255, 107, 53, 0.3)',
                  flexShrink: 0,
                }}
              >
                {(user?.fullName || user?.username || 'U')[0].toUpperCase()}
              </Box>
              {!sidebarCollapsed && (
                <Box sx={{ overflow: 'hidden' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1F2937', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {user?.fullName || user?.username}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#EA580C', fontWeight: 700, display: 'block' }}>
                    {user?.appRole ? ROLE_LABELS[user.appRole] : 'Staff'}
                  </Typography>
                </Box>
              )}
            </Box>

            {!sidebarCollapsed && (
              <IconButton
                size="small"
                onClick={handleLogout}
                disabled={loggingOut}
                title="Logout"
                sx={{ color: '#9CA3AF', '&:hover': { color: '#EF4444', bgcolor: 'rgba(239,68,68,0.08)' } }}
              >
                <LogoutIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>
      </Box>

      {/* Main Content Pane */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh', bgcolor: '#FDFCFB' }}>
        {/* Modern Top Command Header Bar */}
        <Box
          component="header"
          sx={{
            height: 68,
            px: 3.5,
            bgcolor: '#FFFFFF',
            borderBottom: '1px solid #FED7AA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 1100,
            boxShadow: '0 2px 10px rgba(255, 107, 53, 0.04)',
          }}
        >
          {/* Left: Global Command Palette Search Bar */}
          <Button
            onClick={() => setPaletteOpen(true)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              bgcolor: '#FFFBF7',
              color: '#4B5563',
              px: 2,
              py: 0.8,
              borderRadius: 2.5,
              border: '1px solid #FED7AA',
              textTransform: 'none',
              minWidth: { xs: 180, sm: 300, md: 380 },
              justifyContent: 'space-between',
              '&:hover': { bgcolor: '#FFF7ED', borderColor: '#FDBA74' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SearchIcon fontSize="small" sx={{ color: '#FF6B35' }} />
              <Typography variant="body2" sx={{ fontSize: 13, color: '#6B7280' }}>
                Search directory, polygons, or jump...
              </Typography>
            </Box>
            <Chip label="Ctrl + K" size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: '#FFFFFF', border: '1px solid #FED7AA', color: '#EA580C' }} />
          </Button>

          {/* Right: Quick Action, Services Health, Notification Bell, User Badge */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Quick Action Menu Button */}
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={(e) => setActionAnchor(e.currentTarget)}
              sx={{
                background: 'linear-gradient(135deg, #FF6B35 0%, #FFA043 100%)',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 2,
                px: 2,
                boxShadow: '0 4px 14px rgba(255, 107, 53, 0.28)',
                '&:hover': { background: 'linear-gradient(135deg, #E8551E 0%, #FF8A00 100%)' },
                display: { xs: 'none', sm: 'inline-flex' },
              }}
            >
              Quick Action
            </Button>

            <Menu anchorEl={actionAnchor} open={Boolean(actionAnchor)} onClose={() => setActionAnchor(null)}>
              <MenuItem
                onClick={() => {
                  setActionAnchor(null);
                  onTabChange(1);
                  onQuickAction?.('onboard_employee');
                }}
              >
                👤 Onboard New Employee
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setActionAnchor(null);
                  onTabChange(2);
                  onQuickAction?.('create_geofence');
                }}
              >
                🌐 Define Office Geofence
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setActionAnchor(null);
                  onTabChange(3);
                  onQuickAction?.('manual_punch');
                }}
              >
                ⏱️ Manual Punch Adjustment
              </MenuItem>
              <Divider />
              <MenuItem
                onClick={() => {
                  setActionAnchor(null);
                  onTabChange(5);
                }}
              >
                📈 View Workforce Analytics
              </MenuItem>
            </Menu>

            {/* System Services Mesh Status Pill */}
            <Chip
              icon={<LanIcon sx={{ fontSize: '15px !important', color: '#059669 !important' }} />}
              label="6/6 Services Active"
              size="small"
              onClick={(e) => setServicesAnchor(e.currentTarget)}
              sx={{
                bgcolor: '#ECFDF5',
                color: '#065F46',
                border: '1px solid #A7F3D0',
                fontWeight: 700,
                fontSize: 11,
                cursor: 'pointer',
                display: { xs: 'none', md: 'inline-flex' },
                '&:hover': { bgcolor: '#D1FAE5' },
              }}
            />

            <Popover
              open={Boolean(servicesAnchor)}
              anchorEl={servicesAnchor}
              onClose={() => setServicesAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{ paper: { sx: { p: 2.5, width: 320, borderRadius: 3, boxShadow: '0 12px 32px rgba(0,0,0,0.12)' } } }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <LanIcon sx={{ color: '#10B981' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Microservices Mesh Topology
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Live internal communication via unified API Gateway proxy.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {microservices.map((svc) => (
                  <Box key={svc.name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderRadius: 1.5, bgcolor: '#F8FAFC' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 12 }}>
                        {svc.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B', fontFamily: 'monospace' }}>
                        Port :{svc.port}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Chip label={svc.status} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: '#DCFCE7', color: '#15803D' }} />
                      <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', fontSize: 10 }}>
                        {svc.latency}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Popover>

            {/* Real-time SSE Notification Bell */}
            <NotificationBell />

            {/* User Role Tag */}
            {user?.appRole && (
              <Chip
                label={ROLE_LABELS[user.appRole]}
                size="small"
                sx={{
                  fontWeight: 800,
                  fontSize: 11,
                  bgcolor: '#FFF7ED',
                  color: '#EA580C',
                  border: '1px solid #FED7AA',
                }}
              />
            )}
          </Box>
        </Box>

        {/* Main Content Area Container */}
        <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, sm: 3, md: 4 }, flexGrow: 1 }}>
          {children}
        </Container>
      </Box>

      {/* Global Command Palette Dialog (Ctrl+K) */}
      <Dialog
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3.5,
              p: 1,
              bgcolor: '#FFFFFF',
              boxShadow: '0 24px 64px rgba(255, 107, 53, 0.15), 0 4px 16px rgba(0,0,0,0.06)',
              border: '1px solid #FED7AA',
            },
          },
        }}
      >
        <DialogTitle sx={{ p: 1.5, pb: 1 }}>
          <TextField
            autoFocus
            fullWidth
            placeholder="Type to search operations, geofences, or jump to tab..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#FF6B35' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5,
                bgcolor: '#FFFBF7',
                '&.Mui-focused fieldset': {
                  borderColor: '#FF6B35',
                },
              },
            }}
          />
        </DialogTitle>
        <DialogContent sx={{ p: 1.5 }}>
          <Typography variant="caption" sx={{ color: '#9CA3AF', fontWeight: 800, px: 1, mb: 1, display: 'block' }}>
            NAVIGATION & QUICK JUMP
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {filteredPaletteItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  fullWidth
                  onClick={() => {
                    onTabChange(item.id);
                    setPaletteOpen(false);
                  }}
                  sx={{
                    justifyContent: 'space-between',
                    px: 2,
                    py: 1.2,
                    borderRadius: 2,
                    textTransform: 'none',
                    color: '#1F2937',
                    '&:hover': { bgcolor: '#FFF7ED', color: '#FF6B35' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Icon sx={{ color: '#9CA3AF', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.label}
                    </Typography>
                  </Box>
                  <ArrowForwardIosIcon sx={{ fontSize: 12, color: '#D1D5DB' }} />
                </Button>
              );
            })}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Global Success Notice Snackbar */}
      <Snackbar open={Boolean(notice)} autoHideDuration={4000} onClose={clearNotice}>
        <Alert severity="success" onClose={clearNotice} variant="filled" sx={{ borderRadius: 2.5 }}>
          {notice}
        </Alert>
      </Snackbar>
    </Box>
  );
}
