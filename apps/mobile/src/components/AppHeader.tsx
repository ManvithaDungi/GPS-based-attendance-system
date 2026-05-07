/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Icon from './Icon';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { rs, rms, rvs } from '../utils/responsive'; // ← responsive helpers

export const AppHeader: React.FC = () => {
   const { theme, toggleTheme } = useTheme();
   const { user } = useAuth();
   const themeColors = colors[theme];

   return (
      <View style={[styles.container, { backgroundColor: themeColors.surface }]}>

         {/* LEFT */}
         <View style={styles.left}>
            <Image
               source={{
                  uri: `https://api.dicebear.com/7.x/avataaars/png?seed=${user?.id}`,
               }}
               style={styles.avatar}
            />

            <View>
               <Text style={[styles.greeting, { color: themeColors.textSecondary }]}>
                  Hi,
               </Text>

               <Text style={[styles.name, { color: themeColors.text }]}>
                  {user?.name || 'Student'}
               </Text>
            </View>
         </View>

         {/* RIGHT */}
         <TouchableOpacity style={styles.iconBtn} onPress={toggleTheme}>
            <Icon name={theme === 'light' ? 'weather-night' : 'white-balance-sunny'} size={rs(22)} color={themeColors.text} />
         </TouchableOpacity>
      </View>
   );
};

const styles = StyleSheet.create({
   container: {
      width: '100%',
      paddingHorizontal: rs(20),
      paddingVertical: rvs(14),
      borderBottomLeftRadius: rs(24),
      borderBottomRightRadius: rs(24),

      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',

      marginHorizontal: 0,
      marginTop: 0,

      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 6,
   },

   left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: rs(10),
   },

   avatar: {
      width: rs(40),
      height: rs(40),
      borderRadius: rs(20),
   },

   greeting: {
      fontSize: rms(11),
      fontWeight: '600',
   },

   name: {
      fontSize: rms(16),
      fontWeight: '900',
   },

   iconBtn: {
      padding: rs(8),
      borderRadius: rs(10),
   },
});