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
  FlatList
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../theme/colors';
import { NeumorphicCard } from '../../components/NeumorphicCard';
import { StatusBadge } from '../../components/StatusBadge';
import { api } from '../../services/api';

export const AttendanceScreen: React.FC = () => {
  const { theme } = useTheme();
  const themeColors = colors[theme];
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [historyRes, statsRes] = await Promise.all([
        api.get('/attendance/history?page=1&limit=10'),
        api.get('/attendance/summary')
      ]);
      setHistory(historyRes.data.data || []);
      setStats(statsRes.data);
    } catch (e) {
      console.error('Failed to fetch attendance data', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={colors.light.success} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]} contentContainerStyle={styles.content}>
      {/* Stats Summary */}
      <View style={styles.statsGrid}>
        <NeumorphicCard style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.light.success }]}>{stats?.presentDays || 0}</Text>
          <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>PRESENT</Text>
        </NeumorphicCard>
        <NeumorphicCard style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.light.error }]}>{stats?.absentDays || 0}</Text>
          <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>ABSENT</Text>
        </NeumorphicCard>
        <NeumorphicCard style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.light.warning }]}>{stats?.lateDays || 0}</Text>
          <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>LATE</Text>
        </NeumorphicCard>
      </View>

      <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Recent Activity</Text>

      {history.map((item, index) => (
        <NeumorphicCard key={item.id || index} style={styles.historyCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.dateText, { color: themeColors.text }]}>
                {new Date(item.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
              <Text style={[styles.dayText, { color: themeColors.textSecondary }]}>
                {new Date(item.date).toLocaleDateString('en-US', { weekday: 'long' })}
              </Text>
            </View>
            <StatusBadge status={item.status} />
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.cardFooter}>
            <View style={styles.timeInfo}>
              <MaterialCommunityIcons name="clock-in" size={14} color={themeColors.outline} />
              <Text style={[styles.timeText, { color: themeColors.textSecondary }]}>
                IN: {item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </Text>
            </View>
            <View style={styles.timeInfo}>
              <MaterialCommunityIcons name="clock-out" size={14} color={themeColors.outline} />
              <Text style={[styles.timeText, { color: themeColors.textSecondary }]}>
                OUT: {item.checkOutTime ? new Date(item.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </Text>
            </View>
          </View>
        </NeumorphicCard>
      ))}
    </ScrollView>
  );
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
    gap: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 8,
  },
  historyCard: {
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '800',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 20,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
  }
});
