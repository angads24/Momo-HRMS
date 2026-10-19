import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import {
  createNotificationEventSource,
  fetchUnreadCount,
} from '../features/notifications/services/notificationService';
import type { AppNotification } from '../features/notifications/types/notification';
import { PATHS } from '../routes/paths';

interface NotificationContextValue {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  latestNotification: AppNotification | null;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [latestNotification, setLatestNotification] = useState<AppNotification | null>(null);
  const [toastNotification, setToastNotification] = useState<AppNotification | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const prevCountRef = useRef<number>(0);

  const recipientIdentifier = useMemo(() => {
    if (!user) return '';
    if (user.appRole === 'ADMIN') return 'ADMIN';
    if (user.appRole === 'HR') return 'HR';
    return user.username || user.email || 'USER';
  }, [user]);

  const refreshUnreadCount = useCallback(async () => {
    if (!user || !recipientIdentifier) {
      setUnreadCount(0);
      return;
    }
    try {
      const count = await fetchUnreadCount();
      setUnreadCount(count);
      prevCountRef.current = count;
    } catch {
      // Non-fatal if backend is briefly offline
    }
  }, [user, recipientIdentifier]);

  // Initial fetch and focus sync
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    void refreshUnreadCount();

    let lastFocusFetch = Date.now();
    const onFocus = () => {
      const now = Date.now();
      if (now - lastFocusFetch > 60000) {
        lastFocusFetch = now;
        void refreshUnreadCount();
      }
    };
    window.addEventListener('focus', onFocus);

    // Periodic background sync fallback every 60 seconds (SSE stream handles instant real-time events)
    const pollTimer = setInterval(() => {
      void refreshUnreadCount();
    }, 60000);

    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(pollTimer);
    };
  }, [user, refreshUnreadCount]);

  // Real-time Server-Sent Events (SSE) Stream
  useEffect(() => {
    if (!user || !recipientIdentifier) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    let isMounted = true;
    try {
      const eventSource = createNotificationEventSource(
        recipientIdentifier,
        (newNotif) => {
          if (!isMounted) return;
          // Increment count immediately in real time
          setUnreadCount((prev) => prev + 1);
          setLatestNotification(newNotif);
          setToastNotification(newNotif);

          // Also trigger server count sync in background to confirm exact count
          setTimeout(() => {
            if (isMounted) void refreshUnreadCount();
          }, 600);
        },
        () => {
          // Reconnect logic handled automatically by EventSource
        },
        user.email,
      );
      eventSourceRef.current = eventSource;
    } catch (err) {
      console.warn('Could not connect SSE notification stream:', err);
    }

    return () => {
      isMounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [user, refreshUnreadCount]);

  const handleCloseToast = () => {
    setToastNotification(null);
  };

  const handleViewNotification = () => {
    setToastNotification(null);
    navigate(PATHS.notifications);
  };

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        refreshUnreadCount,
        setUnreadCount,
        latestNotification,
      }}
    >
      {children}

      {/* Floating Real-Time Incoming Notification Toast Banner */}
      <Snackbar
        open={Boolean(toastNotification)}
        autoHideDuration={6000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity="info"
          icon={<NotificationsActiveIcon sx={{ color: '#2563eb' }} />}
          onClose={handleCloseToast}
          sx={{
            width: { xs: '90vw', sm: 380 },
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.14)',
            borderRadius: 2.5,
            border: '1px solid #bfdbfe',
            bgcolor: '#ffffff',
            color: '#1e293b',
            '& .MuiAlert-icon': {
              alignItems: 'center',
            },
          }}
        >
          <Box sx={{ pr: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e3a8a' }}>
              {toastNotification?.title || 'New Notification'}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontSize: '0.82rem',
                color: '#475569',
                mt: 0.25,
                mb: 1,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {toastNotification?.body}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button
                size="small"
                variant="contained"
                color="primary"
                onClick={handleViewNotification}
                sx={{
                  py: 0.25,
                  px: 1.5,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  borderRadius: 1.5,
                  textTransform: 'none',
                }}
              >
                View
              </Button>
            </Box>
          </Box>
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
