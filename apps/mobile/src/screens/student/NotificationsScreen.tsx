/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../theme/colors';
import { NeumorphicCard, NeumorphicButton } from '../../components/NeumorphicCard';
import { api } from '../../services/api';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export const NotificationsScreen: React.FC = () => {
  const { theme } = useTheme();
  const themeColors = colors[theme];
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();

    // ✅ FIX: auto refresh every 5 seconds
    const interval = setInterval(fetchNotifications, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      setError(null);
      const response = await api.get('/notifications');

      const data = response.data.data || [];

      setNotifications(data);

      // ✅ FIX: update unread count
      const unread = data.filter((n: Notification) => !n.read).length;
      setUnreadCount(unread);

    } catch (e) {
      console.error('Failed to fetch notifications', e);
      setError('Failed to load notifications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);

      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );

      setUnreadCount(prev => Math.max(prev - 1, 0));

    } catch (e) {
      console.error('Failed to mark read', e);
    }
  };

  const markAllRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length === 0) return;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);

      await Promise.all(unreadIds.map(id => api.patch(`/notifications/${id}/read`)));

    } catch (e) {
      console.error('Failed to mark all as read', e);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={colors.light.success} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: themeColors.background }]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={64} color={colors.light.error} />
        <Text style={[styles.emptyText, { color: themeColors.text, marginTop: 16 }]}>{error}</Text>
        <TouchableOpacity style={{ marginTop: 24 }} onPress={() => { setIsLoading(true); fetchNotifications(); }}>
          <Text style={[styles.actionText, { color: colors.light.success }]}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]} contentContainerStyle={styles.content}>

      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.text }]}>Notifications</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {/* ✅ UNREAD COUNT DISPLAY */}
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}

          <TouchableOpacity onPress={markAllRead}>
            <Text style={[styles.actionText, { color: colors.light.success }]}>
              Mark all read
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {notifications.length > 0 ? (
        notifications.map((item, index) => (
          <TouchableOpacity key={item.id || index} onPress={() => !item.read && markAsRead(item.id)}>
            <NeumorphicCard style={[styles.notifCard, item.read && { opacity: 0.7 }]}>
              <View style={[styles.iconBox, { backgroundColor: getIconBg(item.type) }]}>
                <MaterialCommunityIcons name={getIconName(item.type)} size={20} color="#FFF" />
              </View>

              <View style={styles.cardContent}>
                <Text style={[styles.notifTitle, { color: themeColors.text }]}>
                  {item.title}
                </Text>

                <Text style={[styles.notifMessage, { color: themeColors.textSecondary }]}>
                  {parseNotificationBody(item.body, item.title)}
                </Text>

                <Text style={[styles.notifTime, { color: themeColors.textSecondary }]}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </View>

              {!item.read && <View style={styles.unreadDot} />}
            </NeumorphicCard>
          </TouchableOpacity>
        ))
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="bell-off-outline" size={64} color={themeColors.outline + '30'} />
          <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
            No notifications yet
          </Text>
        </View>
      )}

      {notifications.length === 50 && (
        <NeumorphicButton style={styles.loadMoreButton}>
          <Text style={[styles.loadMoreText, { color: themeColors.text }]}>
            Load Previous
          </Text>
        </NeumorphicButton>
      )}
    </ScrollView>
  );
};

const getIconName = (type: string): any => {
  switch (type?.toLowerCase()) {
    case 'info': return 'information-outline';
    case 'success': return 'check-circle-outline';
    case 'warning': return 'alert-outline';
    default: return 'bell-outline';
  }
};

const getIconBg = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'info': return '#4299E1';
    case 'success': return '#48BB78';
    case 'warning': return '#ECC94B';
    default: return '#A0AEC0';
  }
};

const parseNotificationBody = (body: string, title: string): string => {
  const isoMatch = body.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[^Z\s]*Z)/);

  if (isoMatch && isoMatch[1]) {
    const timestamp = new Date(isoMatch[1]);
    const formattedTime = timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    return body.replace(isoMatch[1], `${formattedTime}`);
  }

  return body;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  notifCard: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  notifMessage: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },
  notifTime: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4299E1',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadMoreButton: {
    marginTop: 16,
    height: 56,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '700',
  }
});