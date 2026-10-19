import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Alert from '@mui/material/Alert';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SendIcon from '@mui/icons-material/Send';
import { DashboardLayout } from '../../../components/DashboardLayout';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../context/NotificationContext';
import {
  deleteNotification,
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notificationService';
import type { AppNotification } from '../types/notification';
import { NotificationTable } from '../components/NotificationTable';
import { SendNotificationDialog } from '../components/SendNotificationDialog';
import { NotificationPreviewDialog } from '../components/NotificationPreviewDialog';

export default function NotificationListPage() {
  const { user } = useAuth();
  const { setUnreadCount, refreshUnreadCount, latestNotification } = useNotifications();
  const isManagement = user?.appRole === 'ADMIN' || user?.appRole === 'HR';

  const [allNotifications, setAllNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Tabs: 0: All, 1: Unread, 2: Read
  const [tabValue, setTabValue] = useState(0);

  // Pagination (Client-Side)
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Dialogs
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<AppNotification | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams: Record<string, string> = {};
      if (user?.email) queryParams.email = user.email;
      if (user?.appRole) {
        queryParams.role = user.appRole;
        queryParams.recipientId = user.appRole === 'ADMIN' ? 'ADMIN' : user.appRole === 'HR' ? 'HR' : user.email;
      }
      // Transfer complete notification dataset for current user/role
      const res = await fetchNotifications(queryParams);
      const items = res.items ?? [];
      setAllNotifications(items);
      const unread = items.filter((n) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Could not load notifications.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user, setUnreadCount]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  // Synchronize incoming real-time notifications from global context
  useEffect(() => {
    if (latestNotification) {
      setAllNotifications((prev) => [latestNotification, ...prev]);
      setFeedback(`New notification: ${latestNotification.title}`);
    }
  }, [latestNotification]);

  // Client-side filtering based on tabs
  const filteredNotifications = useMemo(() => {
    if (tabValue === 1) {
      return allNotifications.filter((n) => !n.isRead);
    }
    if (tabValue === 2) {
      return allNotifications.filter((n) => n.isRead);
    }
    return allNotifications;
  }, [allNotifications, tabValue]);

  const total = filteredNotifications.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedNotifications = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredNotifications.slice(startIndex, startIndex + pageSize);
  }, [filteredNotifications, currentPage, pageSize]);

  const clientUnreadCount = useMemo(() => {
    return allNotifications.filter((n) => !n.isRead).length;
  }, [allNotifications]);

  const handleTabChange = (_: React.SyntheticEvent, val: number) => {
    setTabValue(val);
    setPage(1);
  };

  const handleMarkAsRead = async (notif: AppNotification) => {
    try {
      await markNotificationAsRead(notif.id);
      setAllNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      void refreshUnreadCount();
    } catch {
      setError('Failed to update notification status.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setAllNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      void refreshUnreadCount();
      setFeedback('All notifications marked as read.');
    } catch {
      setError('Failed to mark all as read.');
    }
  };

  const handleDelete = async (notif: AppNotification) => {
    try {
      await deleteNotification(notif.id, user?.id);
      setAllNotifications((prev) => prev.filter((n) => n.id !== notif.id));
      if (!notif.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
        void refreshUnreadCount();
      }
      setFeedback('Notification dismissed from your inbox.');
    } catch {
      setError('Failed to dismiss notification.');
    }
  };

  const handleViewDetails = (item: AppNotification) => {
    setPreviewItem(item);
    if (!item.isRead) {
      void handleMarkAsRead(item);
    }
  };

  return (
    <DashboardLayout
      title="Notifications & Alerts"
      subtitle="Review real-time in-app alerts, geofence updates, and organization announcements."
    >
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          textColor="primary"
          indicatorColor="primary"
          sx={{
            minHeight: 46,
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
            '& .MuiTab-root': {
              minHeight: 46,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.92rem',
              px: 2.5,
              color: 'text.secondary',
              '&.Mui-selected': {
                color: 'primary.main',
                fontWeight: 700,
              },
            },
          }}
        >
          <Tab label="All Notifications" />
          <Tab
            label={
              <Badge
                badgeContent={clientUnreadCount}
                color="error"
                max={99}
                sx={{
                  '& .MuiBadge-badge': {
                    right: -12,
                    top: 2,
                    fontWeight: 700,
                    fontSize: '0.72rem',
                  },
                }}
              >
                Unread
              </Badge>
            }
          />
          <Tab label="Read" />
        </Tabs>

        <Stack direction="row" spacing={1.5}>
          {clientUnreadCount > 0 && (
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<CheckCircleIcon />}
              onClick={handleMarkAllRead}
            >
              Mark All Read
            </Button>
          )}

          {isManagement && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<SendIcon />}
              onClick={() => setSendDialogOpen(true)}
            >
              Dispatch Notification
            </Button>
          )}
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <NotificationTable
        notifications={paginatedNotifications}
        loading={loading}
        page={currentPage}
        totalPages={totalPages}
        total={total}
        onPageChange={(newPage) => setPage(newPage)}
        onMarkRead={handleMarkAsRead}
        onDelete={handleDelete}
        onViewDetails={handleViewDetails}
      />

      {/* Dispatch Modal */}
      <SendNotificationDialog
        open={sendDialogOpen}
        onClose={() => setSendDialogOpen(false)}
        onNotificationSent={() => {
          setFeedback('Notification dispatched successfully!');
          void loadNotifications();
        }}
      />

      {/* Details Preview Modal */}
      <NotificationPreviewDialog
        open={Boolean(previewItem)}
        notification={previewItem}
        onClose={() => setPreviewItem(null)}
        onMarkRead={handleMarkAsRead}
        onActionComplete={() => {
          void loadNotifications();
        }}
      />

      <Snackbar open={Boolean(feedback)} autoHideDuration={4000} onClose={() => setFeedback(null)}>
        <Alert severity="success" variant="filled" onClose={() => setFeedback(null)}>
          {feedback}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
