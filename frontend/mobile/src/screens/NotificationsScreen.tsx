import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
  getCachedUnreadCount,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  setGlobalUnreadCount,
} from '../api/notificationApi';
import type { AppNotification } from '../api/notificationApi';
import { ScreenHeader } from '../components/ScreenHeader';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { palette } from '../theme/theme';

interface GroupedNotifications {
  title: string;
  data: AppNotification[];
}

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { user, employeeProfile } = useAuth();

  // Notifications state
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recipientId = employeeProfile?.employeeCode || employeeProfile?.id || user?.id || '';
  const userEmail = user?.email || employeeProfile?.email || '';
  const userId = user?.id || employeeProfile?.id || undefined;

  const notificationsRef = useRef<AppNotification[]>([]);
  notificationsRef.current = notifications;

  // When leaving the screen, ensure all loaded notifications viewed by the employee are marked read
  useEffect(() => {
    return () => {
      const unreadItems = notificationsRef.current.filter((n) => !n.isRead);
      if (unreadItems.length > 0) {
        setGlobalUnreadCount(0);
        void markAllNotificationsAsRead({
          recipientId: recipientId || undefined,
          email: userEmail || undefined,
          userId: userId || undefined,
        });
        unreadItems.forEach((n) => {
          void markNotificationAsRead(n.id, {
            recipientId: n.recipientId || recipientId || undefined,
            email: userEmail || undefined,
            userId: userId || undefined,
          }).catch(() => undefined);
        });
      }
    };
  }, [recipientId, userEmail, userId]);

  // 1. Load Notifications
  const loadNotifications = useCallback(async () => {
    if (!recipientId && !userEmail) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setError(null);
    try {
      const res = await getNotifications({
        recipientId: recipientId || undefined,
        email: userEmail || undefined,
        limit: 50,
      });
      const items = res.items || [];
      setNotifications(items);
      const unread = items.filter((n) => !n.isRead).length;
      setGlobalUnreadCount(unread, false);
    } catch {
      setError('Unable to load notifications. Please check your network connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [recipientId, userEmail]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = async (notification: AppNotification) => {
    if (notification.isRead) return;

    // Snappy optimistic local UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
    );
    // Immediately decrease global unread count
    setGlobalUnreadCount(Math.max(0, getCachedUnreadCount() - 1));

    try {
      await markNotificationAsRead(notification.id, {
        recipientId: notification.recipientId || recipientId || undefined,
        email: userEmail || undefined,
        userId: userId || undefined,
      });
    } catch {
      await loadNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    const unreadItems = notifications.filter((n) => !n.isRead);
    if (unreadItems.length === 0) return;

    // Snappy optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setGlobalUnreadCount(0);

    try {
      const batchPromise = markAllNotificationsAsRead({
        recipientId: recipientId || undefined,
        email: userEmail || undefined,
        role: employeeProfile?.role?.name || undefined,
        userId: userId || undefined,
      });
      const individualPromises = unreadItems.map((n) =>
        markNotificationAsRead(n.id, {
          recipientId: n.recipientId || recipientId || undefined,
          email: userEmail || undefined,
          userId: userId || undefined,
        }).catch(() => undefined),
      );
      await Promise.allSettled([batchPromise, ...individualPromises]);
    } catch (err) {
      console.warn('Failed to mark all as read:', err);
    }
  };

  // Group notifications into Today, Yesterday, and Earlier
  const groupNotifications = (items: AppNotification[]): GroupedNotifications[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayItems: AppNotification[] = [];
    const yesterdayItems: AppNotification[] = [];
    const olderItems: AppNotification[] = [];

    items.forEach((item) => {
      try {
        const itemDate = new Date(item.createdAt);
        itemDate.setHours(0, 0, 0, 0);

        if (itemDate.getTime() === today.getTime()) {
          todayItems.push(item);
        } else if (itemDate.getTime() === yesterday.getTime()) {
          yesterdayItems.push(item);
        } else {
          olderItems.push(item);
        }
      } catch {
        olderItems.push(item);
      }
    });

    const groups: GroupedNotifications[] = [];
    if (todayItems.length > 0) groups.push({ title: 'TODAY', data: todayItems });
    if (yesterdayItems.length > 0) groups.push({ title: 'YESTERDAY', data: yesterdayItems });
    if (olderItems.length > 0) groups.push({ title: 'EARLIER', data: olderItems });

    return groups;
  };

  const formatTimestamp = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const d = new Date(isoString);
      d.setHours(0, 0, 0, 0);

      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (d.getTime() === today.getTime()) {
        return timeStr;
      }

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (d.getTime() === yesterday.getTime()) {
        return `Yesterday, ${timeStr}`;
      }

      return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
    } catch {
      return '';
    }
  };

  const getVisualType = (item: AppNotification) => {
    const typeUpper = (item.type || '').toUpperCase();
    if (typeUpper.includes('SPECIAL') || typeUpper.includes('ADJUSTMENT')) {
      if (typeUpper.includes('APPROVED')) {
        return {
          icon: 'star-circle' as const,
          color: '#16A34A',
          bg: '#F0FDF4',
          borderColor: '#BBF7D0',
          tag: 'Special Approved',
        };
      }
      if (typeUpper.includes('REJECTED')) {
        return {
          icon: 'close-circle' as const,
          color: palette.error,
          bg: '#FEF2F2',
          borderColor: '#FECACA',
          tag: 'Special Rejected',
        };
      }
      return {
        icon: 'clock-star-four-points' as const,
        color: '#7C3AED',
        bg: '#F5F3FF',
        borderColor: '#DDD6FE',
        tag: 'Special Hours',
      };
    }

    if (
      typeUpper.includes('CHECKIN') ||
      typeUpper.includes('CHECKOUT') ||
      typeUpper.includes('CHECK_IN') ||
      typeUpper.includes('CHECK_OUT') ||
      typeUpper.includes('APPROVED')
    ) {
      if (typeUpper.includes('AUTO')) {
        return {
          icon: 'alert-circle' as const,
          color: '#D97706',
          bg: '#FFFBEB',
          borderColor: '#FDE68A',
          tag: 'Automatic',
        };
      }
      return {
        icon: 'check-circle' as const,
        color: palette.success,
        bg: '#F0FDF4',
        borderColor: '#BBF7D0',
        tag: 'Attendance',
      };
    }

    if (
      typeUpper.includes('REMINDER') ||
      typeUpper.includes('WARNING') ||
      typeUpper.includes('LATE') ||
      typeUpper.includes('EXIT')
    ) {
      return {
        icon: 'clock-alert-outline' as const,
        color: '#D97706',
        bg: '#FFFBEB',
        borderColor: '#FDE68A',
        tag: 'Alert',
      };
    }

    if (
      typeUpper.includes('OUTSIDE') ||
      typeUpper.includes('ERROR') ||
      typeUpper.includes('REJECTED') ||
      typeUpper.includes('ISSUE')
    ) {
      return {
        icon: 'alert-octagon' as const,
        color: palette.error,
        bg: '#FEF2F2',
        borderColor: '#FECACA',
        tag: 'Attention',
      };
    }

    return {
      icon: 'information-outline' as const,
      color: palette.primary,
      bg: '#EFF6FF',
      borderColor: '#BFDBFE',
      tag: 'Notice',
    };
  };

  const groups = groupNotifications(notifications);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <ScreenHeader
        title="Notifications"
        onBack={() => navigation.goBack()}
        rightAction={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/* NOTIFICATIONS FEED */}
      {loading && !refreshing ? (
        <LoadingIndicator message="Checking notifications..." />
      ) : error ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={palette.error} />
          <Text style={styles.emptyTitle}>Something went wrong</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadNotifications}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <MaterialCommunityIcons name="bell-outline" size={44} color={palette.primary} />
          </View>
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptySubtitle}>You're all caught up with your attendance updates.</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.title}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[palette.primary]}
            />
          }
          renderItem={({ item: group }) => (
            <View style={styles.groupSection}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              {group.data.map((notification) => {
                const visual = getVisualType(notification);
                return (
                  <TouchableOpacity
                    key={notification.id}
                    activeOpacity={0.8}
                    onPress={() => handleMarkAsRead(notification)}
                  >
                    <Card
                      style={[
                        styles.notificationCard,
                        !notification.isRead && styles.unreadCard,
                      ]}
                      mode="outlined"
                    >
                      <Card.Content style={styles.cardContent}>
                        <View style={styles.cardHeaderRow}>
                          <View style={styles.headerLeft}>
                            <View
                              style={[
                                styles.iconWrap,
                                { backgroundColor: visual.bg, borderColor: visual.borderColor },
                              ]}
                            >
                              <MaterialCommunityIcons
                                name={visual.icon}
                                size={18}
                                color={visual.color}
                              />
                            </View>
                            <Text style={styles.notificationTitle} numberOfLines={1}>
                              {notification.title}
                            </Text>
                          </View>

                          <View style={styles.headerRight}>
                            {!notification.isRead && <View style={styles.unreadDot} />}
                            <Text style={styles.timeText}>
                              {formatTimestamp(notification.createdAt)}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.notificationBody}>
                          {notification.body}
                        </Text>

                        {notification.metadata?.reason ? (
                          <View style={styles.reasonTag}>
                            <Text style={styles.reasonText}>
                              Reason: {String(notification.metadata.reason)}
                            </Text>
                          </View>
                        ) : null}
                      </Card.Content>
                    </Card>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  markAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#EEF2FF',
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.primary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  groupSection: {
    marginBottom: 20,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: palette.subtle,
    marginBottom: 8,
    marginLeft: 4,
  },
  notificationCard: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    marginBottom: 10,
    borderColor: palette.border,
    borderWidth: 1,
  },
  unreadCard: {
    borderColor: palette.primarySubtle,
    borderWidth: 1.5,
    backgroundColor: palette.surface,
  },
  cardContent: {
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.ink,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: palette.primary,
    marginRight: 6,
  },
  timeText: {
    fontSize: 11,
    color: palette.subtle,
  },
  notificationBody: {
    fontSize: 13,
    color: palette.body,
    lineHeight: 18,
  },
  reasonTag: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: palette.borderSubtle,
    alignSelf: 'flex-start',
  },
  reasonText: {
    fontSize: 11,
    color: palette.muted,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.ink,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: palette.muted,
    textAlign: 'center',
    lineHeight: 19,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: palette.primary,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
