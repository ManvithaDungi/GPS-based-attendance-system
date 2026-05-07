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
import { Calendar } from 'react-native-calendars';
import Icon from '../../components/Icon';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../theme/colors';
import { NeumorphicCard } from '../../components/NeumorphicCard';
import { StatusBadge } from '../../components/StatusBadge';
import { api } from '../../services/api';
import { rs, rvs, rms } from '../../utils/responsive';

export const HistoryScreen: React.FC = () => {
  const { theme } = useTheme();
  const themeColors = colors[theme];
  const [attendance, setAttendance] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/attendance/history');
      setAttendance(response.data);
    } catch (e) {
      console.error('Failed to fetch history', e);
    } finally {
      setIsLoading(false);
    }
  };

  const markedDates = attendance.reduce((acc: any, curr: any) => {
    const date = curr.date;
    acc[date] = {
      marked: true,
      dotColor: curr.status === 'PRESENT' ? colors.light.success : colors.light.error
    };
    return acc;
  }, {});

  markedDates[selectedDate] = {
    ...markedDates[selectedDate],
    selected: true,
    selectedColor: colors.light.success,
  };

  const selectedRecord = attendance.find(a => a.date === selectedDate);

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]} contentContainerStyle={styles.content}>
      <NeumorphicCard style={styles.calendarCard}>
        <Calendar
          theme={{
            backgroundColor: 'transparent',
            calendarBackground: 'transparent',
            textSectionTitleColor: themeColors.textSecondary,
            selectedDayBackgroundColor: colors.light.success,
            selectedDayTextColor: '#ffffff',
            todayTextColor: colors.light.success,
            dayTextColor: themeColors.text,
            textDisabledColor: themeColors.outline + '40',
            monthTextColor: themeColors.text,
            indicatorColor: colors.light.success,
            textDayFontWeight: '600',
            textMonthFontWeight: '900',
            textDayHeaderFontWeight: '700',
            textDayFontSize: rms(13),
            textMonthFontSize: rms(15),
            textDayHeaderFontSize: rms(11),
          }}
          markedDates={markedDates}
          onDayPress={(day) => setSelectedDate(day.dateString)}
        />
      </NeumorphicCard>

      <View style={styles.recordSection}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Record Details</Text>

        {isLoading ? (
          <ActivityIndicator style={styles.loader} color={colors.light.success} />
        ) : selectedRecord ? (
          <NeumorphicCard style={styles.detailCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailLabelGroup}>
                <Icon name="calendar-check" size={rs(20)} color={themeColors.primary} />
                <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>STATUS</Text>
              </View>
              <StatusBadge status={selectedRecord.status} />
            </View>

            <View style={styles.divider} />

            <View style={styles.timeGrid}>
              <View style={styles.timeItem}>
                <Text style={[styles.timeLabel, { color: themeColors.textSecondary }]}>IN</Text>
                <Text style={[styles.timeValue, { color: themeColors.text }]}>
                  {selectedRecord.checkInTime ? new Date(selectedRecord.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </Text>
              </View>
              <View style={styles.timeItem}>
                <Text style={[styles.timeLabel, { color: themeColors.textSecondary }]}>OUT</Text>
                <Text style={[styles.timeValue, { color: themeColors.text }]}>
                  {selectedRecord.checkOutTime ? new Date(selectedRecord.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </Text>
              </View>
              <View style={styles.timeItem}>
                <Text style={[styles.timeLabel, { color: themeColors.textSecondary }]}>TOTAL</Text>
                <Text style={[styles.timeValue, { color: themeColors.text }]}>{selectedRecord.duration}</Text>
              </View>
            </View>
          </NeumorphicCard>
        ) : (
          <NeumorphicCard style={styles.emptyCard}>
            <Icon name="calendar-blank" size={rs(48)} color={themeColors.outline + '40'} />
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
              No attendance record for this date
            </Text>
          </NeumorphicCard>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: rs(24),
    gap: rs(24),
  },
  calendarCard: {
    padding: rs(8),
  },
  recordSection: {
    gap: rs(16),
  },
  sectionTitle: {
    fontSize: rms(18),
    fontWeight: '900',
    paddingLeft: rs(4),
  },
  detailCard: {
    padding: rs(20),
    gap: rvs(16),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  detailLabel: {
    fontSize: rms(10),
    fontWeight: '700',
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  timeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeItem: {
    alignItems: 'center',
    gap: rvs(2),
  },
  timeLabel: {
    fontSize: rms(9),
    fontWeight: '700',
  },
  timeValue: {
    fontSize: rms(14),
    fontWeight: '900',
  },
  loader: {
    marginTop: rvs(40),
  },
  emptyCard: {
    padding: rs(40),
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(12),
  },
  emptyText: {
    fontSize: rms(14),
    fontWeight: '600',
    textAlign: 'center',
  }
});