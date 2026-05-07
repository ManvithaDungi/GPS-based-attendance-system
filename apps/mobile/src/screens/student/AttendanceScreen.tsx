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
import Icon from '../../components/Icon';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../theme/colors';
import { NeumorphicCard } from '../../components/NeumorphicCard';
import { StatusBadge } from '../../components/StatusBadge';
import { api } from '../../services/api';
import { AttendanceCalendar } from '../../components/AttendanceCalendar';
import { rs, rvs, rms } from '../../utils/responsive';

export const AttendanceScreen: React.FC = () => {
  const { theme } = useTheme();
  const themeColors = colors[theme];

  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [historyRes, statsRes] = await Promise.all([
        api.get('/attendance/history?page=1&limit=30'),
        api.get('/attendance/summary')
      ]);

      const data = historyRes.data.data || historyRes.data || [];
      setHistory(data);

      const raw = statsRes.data?.data || statsRes.data || {};
      const normalizedStats = {
        presentDays: raw.presentDays ?? raw.present_days ?? raw.totalPresent ?? 0,
        absentDays: raw.absentDays ?? raw.absent_days ?? raw.totalAbsent ?? 0,
        lateDays: raw.lateDays ?? raw.late_days ?? raw.totalLate ?? 0,
        attendancePercentage: raw.attendancePercentage ?? raw.attendance_percentage ?? 0,
        totalDays: raw.totalDays ?? raw.total_days ?? 0,
      };
      setStats(normalizedStats);

    } catch (e: any) {
      console.error('❌ Failed to fetch attendance data:', {
        message: e.message,
        status: e.response?.status,
        data: e.response?.data,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (hours?: number) => {
    if (!hours) return '--';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
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

      {/* HEADER WITH TOGGLE */}
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
          {viewMode === 'list' ? 'Daily Attendance' : 'Attendance Calendar'}
        </Text>

        <View style={styles.toggle}>
          <TouchableOpacity onPress={() => setViewMode('list')}>
            <Icon name="format-list-bulleted" size={rs(22)} color={viewMode === 'list' ? '#4F8EF7' : themeColors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setViewMode('calendar')}>
            <Icon name="calendar-month" size={rs(22)} color={viewMode === 'calendar' ? '#4F8EF7' : themeColors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <>
          <View style={styles.statsGrid}>
            <NeumorphicCard style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.light.success }]}>
                {stats?.presentDays || 0}
              </Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>
                PRESENT
              </Text>
            </NeumorphicCard>

            <NeumorphicCard style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.light.error }]}>
                {stats?.absentDays || 0}
              </Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>
                ABSENT
              </Text>
            </NeumorphicCard>

            <NeumorphicCard style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.light.warning }]}>
                {stats?.lateDays || 0}
              </Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>
                LATE
              </Text>
            </NeumorphicCard>
          </View>

          {history.map((item, index) => (
            <NeumorphicCard key={item.id || index} style={styles.historyCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.dateText, { color: themeColors.text }]}>
                    {new Date(item.date).toDateString()}
                  </Text>
                </View>
                <StatusBadge status={item.status} />
              </View>

              <View style={styles.divider} />

              <View style={styles.cardFooter}>
                <Text>
                  IN: {item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString() : '--'}
                </Text>
                <Text>
                  OUT: {item.checkOutTime ? new Date(item.checkOutTime).toLocaleTimeString() : '--'}
                </Text>
              </View>
            </NeumorphicCard>
          ))}
        </>
      )}

      {/* CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <>
          <AttendanceCalendar
            history={history}
            themeColors={themeColors}
            onSelectDate={(data) => setSelectedDate(data)}
          />

          {selectedDate && (
            <NeumorphicCard style={styles.detailCard}>
              <Text style={{ fontWeight: '800', fontSize: rms(14) }}>
                {new Date(selectedDate.date).toDateString()}
              </Text>

              <Text style={{ fontSize: rms(13) }}>
                Check-in: {selectedDate.checkInTime ? new Date(selectedDate.checkInTime).toLocaleTimeString() : '--'}
              </Text>

              <Text style={{ fontSize: rms(13) }}>
                Check-out: {selectedDate.checkOutTime ? new Date(selectedDate.checkOutTime).toLocaleTimeString() : '--'}
              </Text>

              <Text style={{ fontSize: rms(13) }}>
                Duration: {formatDuration(selectedDate.durationHours)}
              </Text>

              <StatusBadge status={selectedDate.status} />
            </NeumorphicCard>
          )}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: rs(24), gap: rs(20) },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  toggle: {
    flexDirection: 'row',
    gap: rs(16),
  },

  statsGrid: { flexDirection: 'row', gap: rs(12) },

  statCard: {
    flex: 1,
    height: rvs(100),
    justifyContent: 'center',
    alignItems: 'center',
  },

  statValue: { fontSize: rms(24), fontWeight: '900' },
  statLabel: { fontSize: rms(10) },

  sectionTitle: { fontSize: rms(18), fontWeight: '900' },

  historyCard: { padding: rs(16), gap: rvs(10) },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  dateText: { fontWeight: '800', fontSize: rms(14) },

  divider: { height: 1, backgroundColor: '#eee' },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  detailCard: {
    padding: rs(16),
    gap: rvs(8),
  },
});