/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { NeumorphicCard } from './NeumorphicCard';
import { rs, rvs, rms } from '../utils/responsive';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_PADDING = rs(16) * 2;     // padding on both sides inside the card
const COLUMNS = 7;
const GAP = rs(8);
const DAY_WIDTH = Math.floor((SCREEN_WIDTH - CARD_PADDING - rs(48) - GAP * (COLUMNS - 1)) / COLUMNS);
// rs(48) accounts for outer screen padding (24 each side from AttendanceScreen)

interface Props {
   history: any[];
   themeColors: any;
   onSelectDate: (data: any) => void;
}

export const AttendanceCalendar: React.FC<Props> = ({
   history,
   themeColors,
   onSelectDate,
}) => {

   const now = new Date();
   const [month, setMonth] = useState(now.getMonth());
   const [year, setYear] = useState(now.getFullYear());

   const goToPrev = () => {
      if (month === 0) { setMonth(11); setYear(y => y - 1); }
      else setMonth(m => m - 1);
   };

   const goToNext = () => {
      if (month === 11) { setMonth(0); setYear(y => y + 1); }
      else setMonth(m => m + 1);
   };

   const getStatusColor = (status: string) => {
      if (status === 'PRESENT') return '#22C55E';
      if (status === 'ABSENT') return '#EF4444';
      if (status === 'LATE') return '#F59E0B';
      return '#A0AEC0';
   };

   const daysInMonth = new Date(year, month + 1, 0).getDate();
   const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun

   const getDayData = (day: number) => {
      return history.find(item => {
         const d = new Date(item.date);
         return (
            d.getDate() === day &&
            d.getMonth() === month &&
            d.getFullYear() === year
         );
      });
   };

   const monthLabel = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });

   return (
      <NeumorphicCard style={styles.calendar}>
         <View style={styles.header}>
            <TouchableOpacity onPress={goToPrev}>
               <Text style={[styles.arrow, { color: themeColors.text }]}>{'‹'}</Text>
            </TouchableOpacity>
            <Text style={[styles.monthLabel, { color: themeColors.text }]}>{monthLabel}</Text>
            <TouchableOpacity onPress={goToNext}>
               <Text style={[styles.arrow, { color: themeColors.text }]}>{'›'}</Text>
            </TouchableOpacity>
         </View>

         {/* Weekday header row */}
         <View style={styles.weekRow}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
               <Text key={d} style={[styles.weekDay, { color: themeColors.textSecondary, width: DAY_WIDTH }]}>{d}</Text>
            ))}
         </View>

         <View style={styles.grid}>
            {/* Empty cells to offset first day */}
            {Array.from({ length: firstDayOfWeek }, (_, i) => (
               <View key={`empty-${i}`} style={{ width: DAY_WIDTH, marginBottom: rvs(10) }} />
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
               const data = getDayData(day);

               return (
                  <TouchableOpacity
                     key={day}
                     style={[styles.day, { width: DAY_WIDTH }]}
                     onPress={() => data && onSelectDate(data)}
                  >
                     <Text style={{ color: themeColors.text, fontSize: rms(13) }}>{day}</Text>

                     {data && (
                        <View
                           style={[
                              styles.dot,
                              { backgroundColor: getStatusColor(data.status) },
                           ]}
                        />
                     )}
                  </TouchableOpacity>
               );
            })}
         </View>
      </NeumorphicCard>
   );
};

const styles = StyleSheet.create({
   calendar: {
      padding: rs(16),
   },
   header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: rvs(8),
   },
   monthLabel: {
      fontSize: rms(16),
      fontWeight: '600',
   },
   arrow: {
      fontSize: rms(24),
      paddingHorizontal: rs(8),
   },
   weekRow: {
      flexDirection: 'row',
      marginBottom: rvs(6),
   },
   weekDay: {
      textAlign: 'center',
      fontSize: rms(10),
      fontWeight: '700',
   },
   grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: GAP,
   },
   day: {
      alignItems: 'center',
      marginBottom: rvs(6),
   },
   dot: {
      width: rs(6),
      height: rs(6),
      borderRadius: rs(3),
      marginTop: rvs(3),
   },
});