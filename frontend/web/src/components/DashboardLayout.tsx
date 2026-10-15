import { useState, useEffect, type ReactNode, type MouseEvent } from 'react';
import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';
import PeopleIcon from '@mui/icons-material/People';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { COMPANY_NAME } from '../config/env';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { PATHS, homePathForUser } from '../routes/paths';
import { ROLE_LABELS } from '../utils/roles';
import { ProfileDialog } from './ProfileDialog';

interface Props {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  hideUserCard?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  noHeader?: boolean;
}

interface NavItem {
  id: string;
  label: string;
  to: string;
  icon: ReactNode;
  active: boolean;
  priority?: boolean;
}

/** Shared layout of module pages (enterprise navbar, avatar dropdown, drawer, notice). */
export function DashboardLayout({
  title,
  subtitle,
  children,
  hideUserCard = false,
  maxWidth = 'xl',
  noHeader = false,
}: Props) {
  const { user, logout, notice, clearNotice } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState<null | HTMLElement>(null);

  const isManagementUser = user?.appRole === 'ADMIN' || user?.appRole === 'HR';
  const isHr = user?.appRole === 'HR';
  const isAdmin = user?.appRole === 'ADMIN';
  const isEmployee = user?.appRole === 'EMPLOYEE';

  const pathname = location.pathname;

  // Build navigation items based on role
  const navItems: NavItem[] = [];

  if (isAdmin) {
    navItems.push(
      {
        id: 'admin-dash',
        label: 'Admin Dashboard',
        to: PATHS.admin,
        icon: <DashboardIcon sx={{ fontSize: 18 }} />,
        active: pathname === PATHS.admin || pathname === '/' || pathname === '/dashboard',
        priority: true,
      },
      {
        id: 'employees',
        label: 'Employees',
        to: PATHS.employees,
        icon: <PeopleIcon sx={{ fontSize: 18 }} />,
        active: pathname.startsWith('/admin/employees'),
        priority: true,
      },
      {
        id: 'hr-live',
        label: 'Live Monitor (HR)',
        to: PATHS.hr,
        icon: <AssessmentIcon sx={{ fontSize: 18 }} />,
        active: pathname === PATHS.hr,
        priority: true,
      },
      {
        id: 'geofences',
        label: 'Geofences',
        to: PATHS.geofences,
        icon: <LocationOnIcon sx={{ fontSize: 18 }} />,
        active: pathname.startsWith('/geofences'),
        priority: false,
      },
      {
        id: 'reports',
        label: 'Reports',
        to: PATHS.attendanceReports,
        icon: <AssessmentIcon sx={{ fontSize: 18 }} />,
        active: pathname === PATHS.attendanceReports,
        priority: false,
      },
      {
        id: 'notifications',
        label: 'Notifications',
        to: PATHS.notifications,
        icon: <NotificationsIcon sx={{ fontSize: 18 }} />,
        active: pathname.startsWith('/notifications'),
        priority: false,
      },
    );
  } else if (isHr) {
    navItems.push(
      {
        id: 'hr-dash',
        label: 'Dashboard',
        to: PATHS.hr,
        icon: <DashboardIcon sx={{ fontSize: 18 }} />,
        active: pathname === PATHS.hr || pathname === '/' || pathname === '/dashboard',
        priority: true,
      },
      {
        id: 'employees',
        label: 'Employees',
        to: PATHS.employees,
        icon: <PeopleIcon sx={{ fontSize: 18 }} />,
        active: pathname.startsWith('/admin/employees'),
        priority: true,
      },
      {
        id: 'reports',
        label: 'Reports',
        to: PATHS.attendanceReports,
        icon: <AssessmentIcon sx={{ fontSize: 18 }} />,
        active: pathname === PATHS.attendanceReports,
        priority: true,
      },
      {
        id: 'notifications',
        label: 'Notifications',
        to: PATHS.notifications,
        icon: <NotificationsIcon sx={{ fontSize: 18 }} />,
        active: pathname.startsWith('/notifications'),
        priority: false,
      },
    );
  } else if (isEmployee) {
    navItems.push(
      {
        id: 'emp-attendance',
        label: 'Attendance',
        to: PATHS.attendance,
        icon: <AccessTimeIcon sx={{ fontSize: 18 }} />,
        active: pathname === PATHS.attendance,
        priority: true,
      },
      {
        id: 'notifications',
        label: 'Notifications',
        to: PATHS.notifications,
        icon: <NotificationsIcon sx={{ fontSize: 18 }} />,
        active: pathname.startsWith('/notifications'),
        priority: true,
      },
    );
  }

  const primaryNavItems = navItems.filter((i) => i.priority);
  const secondaryNavItems = navItems.filter((i) => !i.priority);
  const hasSecondaryActive = secondaryNavItems.some((i) => i.active);

  const userDisplayName = user?.fullName || user?.username || 'User';
  const userInitials = userDisplayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleOpenUserMenu = (e: MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(e.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setUserMenuAnchor(null);
  };

  const handleOpenMoreMenu = (e: MouseEvent<HTMLElement>) => {
    setMoreMenuAnchor(e.currentTarget);
  };

  const handleCloseMoreMenu = () => {
    setMoreMenuAnchor(null);
  };

  // Global Keyboard Accessibility Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes open drawer, user menu or dialogs
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setUserMenuAnchor(null);
        setMoreMenuAnchor(null);
        setProfileOpen(false);
      }
      // Pressing "/" focuses the primary search input on the page if not currently typing
      if (
        (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key === 'k')) &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[placeholder*="Search" i], input[type="search"], input[aria-label*="Search" i]',
        );
        searchInput?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Skip to Main Content Link for Keyboard Users */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      {/* Upper Horizontal Navigation Bar */}
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: '#ffffff',
          top: 0,
          zIndex: 1100,
        }}
      >
        <Toolbar
          sx={{
            gap: 1.5,
            px: { xs: 2, sm: 3 },
            minHeight: { xs: 58, sm: 64 },
            maxWidth: 1440,
            mx: 'auto',
            width: '100%',
          }}
        >
          {/* Logo / Brand Name */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              mr: { xs: 1, md: 3 },
            }}
            onClick={() => navigate(homePathForUser(user))}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '8px',
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.9rem',
              }}
            >
              M
            </Box>
            <Typography
              variant="h6"
              color="primary"
              sx={{
                fontWeight: 800,
                letterSpacing: -0.3,
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              {COMPANY_NAME}
            </Typography>
          </Box>

          {/* Desktop Navigation Links */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.75, flexGrow: 1, alignItems: 'center' }}>
            {/* Primary Nav Links */}
            {primaryNavItems.map((item) => {
              const showBadge = item.id === 'notifications' && unreadCount > 0;
              return (
                <Button
                  key={item.id}
                  component={RouterLink}
                  to={item.to}
                  size="small"
                  startIcon={item.icon}
                  sx={{
                    fontWeight: item.active ? 700 : 500,
                    color: item.active ? 'primary.main' : 'text.primary',
                    bgcolor: item.active ? 'rgba(27, 75, 143, 0.08)' : 'transparent',
                    borderRadius: 2,
                    px: 1.5,
                    py: 0.75,
                    minHeight: 36,
                    fontSize: '0.84rem',
                    border: item.active ? '1px solid rgba(27, 75, 143, 0.15)' : '1px solid transparent',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: item.active ? 'rgba(27, 75, 143, 0.12)' : 'rgba(0, 0, 0, 0.04)',
                    },
                    '&.Mui-focusVisible, &:focus-visible': {
                      bgcolor: item.active ? 'rgba(27, 75, 143, 0.08)' : 'transparent',
                      outline: '2px solid #2563eb',
                      outlineOffset: 2,
                    },
                  }}
                >
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                    <span>{item.label}</span>
                    {showBadge && (
                      <Box
                        component="span"
                        sx={{
                          bgcolor: '#ef4444',
                          color: '#ffffff',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          borderRadius: '10px',
                          px: 0.65,
                          py: 0.1,
                          lineHeight: 1.2,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 18,
                          height: 18,
                          boxShadow: '0 1px 2px rgba(239, 68, 68, 0.35)',
                        }}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Box>
                    )}
                  </Box>
                </Button>
              );
            })}

            {/* Secondary Nav Links (Expanded on XL, Collapsed into 'More' on MD/LG) */}
            <Box sx={{ display: { xs: 'none', xl: 'flex' }, gap: 0.75 }}>
              {secondaryNavItems.map((item) => {
                const showBadge = item.id === 'notifications' && unreadCount > 0;
                return (
                  <Button
                    key={item.id}
                    component={RouterLink}
                    to={item.to}
                    size="small"
                    startIcon={item.icon}
                    sx={{
                      fontWeight: item.active ? 700 : 500,
                      color: item.active ? 'primary.main' : 'text.primary',
                      bgcolor: item.active ? 'rgba(27, 75, 143, 0.08)' : 'transparent',
                      borderRadius: 2,
                      px: 1.5,
                      py: 0.75,
                      minHeight: 36,
                      fontSize: '0.84rem',
                      border: item.active ? '1px solid rgba(27, 75, 143, 0.15)' : '1px solid transparent',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        bgcolor: item.active ? 'rgba(27, 75, 143, 0.12)' : 'rgba(0, 0, 0, 0.04)',
                      },
                      '&.Mui-focusVisible, &:focus-visible': {
                        bgcolor: item.active ? 'rgba(27, 75, 143, 0.08)' : 'transparent',
                        outline: '2px solid #2563eb',
                        outlineOffset: 2,
                      },
                    }}
                  >
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                      <span>{item.label}</span>
                      {showBadge && (
                        <Box
                          component="span"
                          sx={{
                            bgcolor: '#ef4444',
                            color: '#ffffff',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            borderRadius: '10px',
                            px: 0.65,
                            py: 0.1,
                            lineHeight: 1.2,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 18,
                            height: 18,
                            boxShadow: '0 1px 2px rgba(239, 68, 68, 0.35)',
                          }}
                        >
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Box>
                      )}
                    </Box>
                  </Button>
                );
              })}
            </Box>

            {/* 'More' dropdown for tablet & compact desktop */}
            {secondaryNavItems.length > 0 && (
              <Box sx={{ display: { xs: 'none', md: 'flex', xl: 'none' } }}>
                <Badge
                  color="error"
                  variant="dot"
                  invisible={!secondaryNavItems.some((i) => i.id === 'notifications') || unreadCount === 0}
                >
                  <Button
                    size="small"
                    endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
                    onClick={handleOpenMoreMenu}
                    sx={{
                      fontWeight: hasSecondaryActive ? 700 : 500,
                      color: hasSecondaryActive ? 'primary.main' : 'text.primary',
                      bgcolor: hasSecondaryActive ? 'rgba(27, 75, 143, 0.08)' : 'transparent',
                      borderRadius: 2,
                      px: 1.25,
                      minHeight: 36,
                      fontSize: '0.84rem',
                      border: hasSecondaryActive ? '1px solid rgba(27, 75, 143, 0.15)' : '1px solid transparent',
                    }}
                  >
                    More
                  </Button>
                </Badge>
                <Menu
                  anchorEl={moreMenuAnchor}
                  open={Boolean(moreMenuAnchor)}
                  onClose={handleCloseMoreMenu}
                  transformOrigin={{ horizontal: 'left', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
                  slotProps={{
                    paper: {
                      elevation: 3,
                      sx: { borderRadius: 2, minWidth: 200, mt: 0.5, border: '1px solid #e2e8f0' },
                    },
                  }}
                >
                  {secondaryNavItems.map((item) => {
                    const showBadge = item.id === 'notifications' && unreadCount > 0;
                    return (
                      <MenuItem
                        key={item.id}
                        component={RouterLink}
                        to={item.to}
                        onClick={handleCloseMoreMenu}
                        selected={item.active}
                        sx={{
                          fontSize: '0.875rem',
                          fontWeight: item.active ? 700 : 500,
                          gap: 1.5,
                          py: 1,
                        }}
                      >
                        <Box sx={{ color: item.active ? 'primary.main' : 'text.secondary', display: 'flex' }}>
                          {item.icon}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                          <span>{item.label}</span>
                          {showBadge && (
                            <Chip
                              label={unreadCount > 99 ? '99+' : unreadCount}
                              size="small"
                              color="error"
                              sx={{ height: 18, fontSize: '0.68rem', fontWeight: 700, px: 0.5 }}
                            />
                          )}
                        </Box>
                      </MenuItem>
                    );
                  })}
                </Menu>
              </Box>
            )}
          </Box>

          {/* Right Navigation Actions: User Avatar Menu */}
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
            {user && (
              <>
                <Button
                  onClick={handleOpenUserMenu}
                  size="small"
                  sx={{
                    display: { xs: 'none', sm: 'inline-flex' },
                    alignItems: 'center',
                    gap: 1.25,
                    p: 0.5,
                    pr: 1.25,
                    borderRadius: 9999,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: '#ffffff',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: '#f8fafc',
                      borderColor: '#cbd5e1',
                    },
                  }}
                >
                  <Avatar
                    sx={{
                      width: 28,
                      height: 28,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      bgcolor: 'primary.main',
                    }}
                  >
                    {userInitials}
                  </Avatar>
                  <Box sx={{ textAlign: 'left', display: { xs: 'none', md: 'block' } }}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700, fontSize: '0.8rem', lineHeight: 1.2, color: 'text.primary' }}
                    >
                      {userDisplayName}
                    </Typography>
                    {user.appRole && (
                      <Typography
                        variant="caption"
                        sx={{ fontSize: '0.68rem', color: 'text.secondary', lineHeight: 1 }}
                      >
                        {ROLE_LABELS[user.appRole]}
                      </Typography>
                    )}
                  </Box>
                  <KeyboardArrowDownIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                </Button>

                {/* Dropdown User Menu */}
                <Menu
                  anchorEl={userMenuAnchor}
                  open={Boolean(userMenuAnchor)}
                  onClose={handleCloseUserMenu}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  slotProps={{
                    paper: {
                      elevation: 3,
                      sx: {
                        borderRadius: 2.5,
                        minWidth: 230,
                        mt: 1,
                        p: 0.5,
                        border: '1px solid #e2e8f0',
                      },
                    },
                  }}
                >
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {userDisplayName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', wordBreak: 'break-all' }}>
                      {user.email}
                    </Typography>
                    {user.appRole && (
                      <Chip
                        label={ROLE_LABELS[user.appRole]}
                        size="small"
                        color="primary"
                        sx={{ mt: 1, height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                      />
                    )}
                  </Box>

                  <Divider sx={{ my: 0.5 }} />

                  <MenuItem
                    onClick={() => {
                      handleCloseUserMenu();
                      setProfileOpen(true);
                    }}
                    sx={{ fontSize: '0.85rem', fontWeight: 600, gap: 1.5, py: 1, borderRadius: 1.5 }}
                  >
                    <AccountCircleIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    Profile & Accounts
                  </MenuItem>

                  <Divider sx={{ my: 0.5 }} />

                  <MenuItem
                    onClick={() => {
                      handleCloseUserMenu();
                      void logout();
                    }}
                    sx={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      gap: 1.5,
                      py: 1,
                      borderRadius: 1.5,
                      color: 'error.main',
                      '&:hover': { bgcolor: 'rgba(220, 38, 38, 0.05)' },
                    }}
                  >
                    <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
                    Log out
                  </MenuItem>
                </Menu>
              </>
            )}

            {/* Mobile Hamburger Menu Icon Button */}
            <IconButton
              color="inherit"
              edge="end"
              aria-label="Open navigation menu"
              onClick={() => setMobileMenuOpen(true)}
              sx={{ display: { xs: 'flex', md: 'none' }, borderRadius: 2 }}
            >
              <Badge color="error" variant="dot" invisible={unreadCount === 0}>
                <MenuIcon />
              </Badge>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 300,
            p: 2.5,
            bgcolor: '#ffffff',
            boxSizing: 'border-box',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 26,
                height: 26,
                borderRadius: '6px',
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.85rem',
              }}
            >
              M
            </Box>
            <Typography variant="h6" color="primary" sx={{ fontWeight: 800 }}>
              {COMPANY_NAME}
            </Typography>
          </Box>
          <IconButton size="small" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {user && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2, bgcolor: '#f8fafc' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontWeight: 700, fontSize: '0.875rem' }}>
                {userInitials}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                  {userDisplayName}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                  {user.email}
                </Typography>
              </Box>
            </Box>
          </Paper>
        )}

        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'text.secondary', mb: 1, display: 'block' }}>
          Navigation
        </Typography>

        <List sx={{ p: 0, mb: 2 }}>
          {navItems.map((item) => {
            const showBadge = item.id === 'notifications' && unreadCount > 0;
            return (
              <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  component={RouterLink}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  selected={item.active}
                  sx={{
                    borderRadius: 2,
                    py: 1,
                    '&.Mui-selected': {
                      bgcolor: 'rgba(27, 75, 143, 0.08)',
                      '&:hover': { bgcolor: 'rgba(27, 75, 143, 0.12)' },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 34, color: item.active ? 'primary.main' : 'text.secondary' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
                        <Typography
                          sx={{
                            fontSize: '0.875rem',
                            fontWeight: item.active ? 700 : 500,
                            color: item.active ? 'primary.main' : 'text.primary',
                          }}
                        >
                          {item.label}
                        </Typography>
                        {showBadge && (
                          <Chip
                            label={unreadCount > 99 ? '99+' : unreadCount}
                            size="small"
                            color="error"
                            sx={{ height: 18, fontSize: '0.68rem', fontWeight: 700, px: 0.5 }}
                          />
                        )}
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        <Divider sx={{ my: 1.5 }} />

        <List sx={{ p: 0 }}>
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => {
                setMobileMenuOpen(false);
                setProfileOpen(true);
              }}
              sx={{ borderRadius: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 34, color: 'text.secondary' }}>
                <AccountCircleIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={<Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>Profile & Accounts</Typography>}
              />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                setMobileMenuOpen(false);
                void logout();
              }}
              sx={{ borderRadius: 2, color: 'error.main' }}
            >
              <ListItemIcon sx={{ minWidth: 34, color: 'error.main' }}>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={<Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'error.main' }}>Log out</Typography>}
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>

      {/* Profile Modal */}
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />

      {/* Main Page Container */}
      <Container
        id="main-content"
        component="main"
        tabIndex={-1}
        maxWidth={maxWidth}
        sx={{
          py: { xs: 2.5, sm: 3.5 },
          flex: 1,
          width: '100%',
          outline: 'none',
        }}
      >
        {!noHeader && (title || subtitle) && (
          <Box sx={{ mb: (!hideUserCard && !isManagementUser && user) ? 2 : 3 }}>
            {title && (
              <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        )}

        {!hideUserCard && !isManagementUser && user && (
          <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {user.fullName ?? user.username}
            </Typography>
            <Typography color="text.secondary">{user.email}</Typography>
            {user.appRole ? (
              <Chip
                sx={{ mt: 1.5, fontWeight: 700 }}
                size="small"
                label={ROLE_LABELS[user.appRole]}
                color="primary"
              />
            ) : null}
          </Paper>
        )}

        {children}
      </Container>

      {/* Global Notice Toast */}
      <Snackbar open={Boolean(notice)} autoHideDuration={4000} onClose={clearNotice}>
        <Alert severity="success" onClose={clearNotice} variant="filled">
          {notice}
        </Alert>
      </Snackbar>
    </Box>
  );
}
