/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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

   const getStatusColor = (status: string) => {
      if (status === 'PRESENT') return '#22C55E';
      if (status === 'ABSENT') return '#EF4444';
      if (status === 'LATE') return '#F59E0B';
      return '#A0AEC0';
   };

   const now = new Date();
   const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

   const getDayData = (day: number) => {
      return history.find(item => {
         const d = new Date(item.date);
         return (
            d.getDate() === day &&
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
         );
      });
   };

   return (
      <NeumorphicCard style={styles.calendar}>
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