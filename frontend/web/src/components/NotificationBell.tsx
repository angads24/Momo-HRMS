import { useEffect, useState, useRef, type MouseEvent } from 'react';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Popover from '@mui/material/Popover';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { useAuth } from '../context/AuthContext';
import { notificationApi, type AppNotification } from '../api/notificationApi';

export function NotificationBell() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [loading, setLoading] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const recipientId = user?.email || user?.username || user?.id || '';

  // 1. Fetch initial unread count
  useEffect(() => {
    if (!recipientId) return;

    notificationApi.getUnreadCount(recipientId).then(setUnreadCount);

    // 2. Open Server-Sent Events (SSE) Stream
    const streamUrl = notificationApi.getSseStreamUrl(recipientId);
    try {
      const sse = new EventSource(streamUrl);
      eventSourceRef.current = sse;

      sse.onmessage = (event) => {
        try {
          const newNotif = JSON.parse(event.data) as AppNotification;
          setNotifications((prev) => [newNotif, ...prev.slice(0, 19)]);
          setUnreadCount((c) => c + 1);
        } catch {
          // ignore non-json keepalives
        }
      };

      sse.onerror = () => {
        // SSE will automatically attempt reconnection
      };
    } catch {
      // EventSource fallback
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [recipientId]);

  const handleOpen = async (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    if (!recipientId) return;
    setLoading(true);
    try {
      const data = await notificationApi.listNotifications(recipientId, 1, 15);
      setNotifications(data?.items ?? []);
      setUnreadCount(data?.unreadCount ?? 0);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = async (notif: AppNotification) => {
    if (notif.isRead) return;
    await notificationApi.markAsRead(notif.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    if (!recipientId) return;
    await notificationApi.markAllAsRead(recipientId);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Real-time Notifications">
        <IconButton
          color="inherit"
          onClick={handleOpen}
          sx={{
            bgcolor: 'action.hover',
            '&:hover': { bgcolor: 'action.selected' },
            width: 40,
            height: 40,
          }}
        >
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <NotificationsIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 380,
              maxHeight: 520,
              borderRadius: 3,
              boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
              p: 1.5,
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<DoneAllIcon />}
              onClick={handleMarkAllRead}
              sx={{ textTransform: 'none', fontSize: 12 }}
            >
              Mark all read
            </Button>
          )}
        </Box>

        <Divider sx={{ my: 0.5 }} />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No notifications yet.
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0, maxHeight: 400, overflowY: 'auto' }}>
            {notifications.map((notif) => (
              <ListItem
                key={notif.id}
                onClick={() => handleMarkAsRead(notif)}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  cursor: notif.isRead ? 'default' : 'pointer',
                  bgcolor: notif.isRead ? 'transparent' : 'rgba(27, 75, 143, 0.06)',
                  '&:hover': {
                    bgcolor: notif.isRead ? 'action.hover' : 'rgba(27, 75, 143, 0.1)',
                  },
                }}
              >
                {!notif.isRead && (
                  <FiberManualRecordIcon
                    color="primary"
                    sx={{ fontSize: 10, mr: 1, flexShrink: 0 }}
                  />
                )}
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: notif.isRead ? 500 : 700 }}>
                      {notif.title}
                    </Typography>
                  }
                  secondary={
                    <Box component="span">
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {notif.body}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                        {new Date(notif.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Popover>
    </>
  );
}
