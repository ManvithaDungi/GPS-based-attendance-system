/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NeumorphicCard } from './NeumorphicCard';

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

         <View style={styles.grid}>
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
               const data = getDayData(day);

               return (
                  <TouchableOpacity
                     key={day}
                     style={styles.day}
                     onPress={() => data && onSelectDate(data)}
                  >
                     <Text style={{ color: themeColors.text }}>{day}</Text>

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
      padding: 16,
   },
   header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
   },
   monthLabel: {
      fontSize: 16,
      fontWeight: '600',
   },
   arrow: {
      fontSize: 24,
      paddingHorizontal: 8,
   },
   grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
   },
   day: {
      width: '13%',
      alignItems: 'center',
      marginBottom: 10,
   },
   dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginTop: 4,
   },
});