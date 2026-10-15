import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DashboardLayout } from '../../../components/DashboardLayout';
import {
  deleteNotification,
  fetchNotifications,
  markNotificationAsRead,
} from '../services/notificationService';
import type { AppNotification } from '../types/notification';
import { NotificationTable } from '../components/NotificationTable';
import { NotificationPreviewDialog } from '../components/NotificationPreviewDialog';
import { useNotifications } from '../../../context/NotificationContext';

export default function NotificationHistoryPage() {
  const navigate = useNavigate();
  const { refreshUnreadCount } = useNotifications();

  const [allNotifications, setAllNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [previewItem, setPreviewItem] = useState<AppNotification | null>(null);

  const loadAllHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchNotifications();
      setAllNotifications(res.items ?? []);
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Could not load broadcast history.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAllHistory();
  }, [loadAllHistory]);

  const total = allNotifications.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const displayedNotifications = useMemo(() => {
    const start = (page - 1) * pageSize;
    return allNotifications.slice(start, start + pageSize);
  }, [allNotifications, page, pageSize]);

  const handleMarkAsRead = async (notif: AppNotification) => {
    try {
      await markNotificationAsRead(notif.id);
      setAllNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)),
      );
      void refreshUnreadCount();
    } catch {
      setError('Failed to update notification status.');
    }
  };

  const handleDelete = async (notif: AppNotification) => {
    try {
      await deleteNotification(notif.id);
      setAllNotifications((prev) => prev.filter((n) => n.id !== notif.id));
      void refreshUnreadCount();
    } catch {
      setError('Failed to delete notification.');
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
      title="Notification Broadcast History"
      subtitle="Complete audit log of system alerts, geofence warnings, and announcements."
    >
      <Box sx={{ mb: 3 }}>
        <Button
          variant="text"
          color="inherit"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/notifications')}
        >
          Back to Inbox
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <NotificationTable
        notifications={displayedNotifications}
        loading={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={(newPage) => setPage(newPage)}
        onMarkRead={handleMarkAsRead}
        onDelete={handleDelete}
        onViewDetails={handleViewDetails}
      />

      <NotificationPreviewDialog
        open={Boolean(previewItem)}
        notification={previewItem}
        onClose={() => setPreviewItem(null)}
        onMarkRead={handleMarkAsRead}
      />
    </DashboardLayout>
  );
}
