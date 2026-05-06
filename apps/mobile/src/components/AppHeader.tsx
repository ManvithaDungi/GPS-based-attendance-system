/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

//File Name: AppHeader.tsx

import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

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
            <MaterialCommunityIcons
               name={theme === 'light' ? 'weather-night' : 'white-balance-sunny'}
               size={22}
               color={themeColors.text}
            />
         </TouchableOpacity>
      </View>
   );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const styles = StyleSheet.create({
   container: {
      width: '100%',              // ✅ full width
      paddingHorizontal: 20,      // keeps inner spacing
      paddingVertical: 14,        // slightly smaller height
      borderBottomLeftRadius: 24, // smooth bottom curve
      borderBottomRightRadius: 24,

      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',

      // ❌ remove margins (important)
      marginHorizontal: 0,
      marginTop: 0,

      // softer shadow (top header style)
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 6,
   },

   left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10, // slightly tighter
   },

   avatar: {
      width: 40,   // smaller
      height: 40,
      borderRadius: 20,
   },

   greeting: {
      fontSize: 11,
      fontWeight: '600',
   },

   name: {
      fontSize: 16,  // slightly smaller
      fontWeight: '900',
   },

   iconBtn: {
      padding: 8,
      borderRadius: 10,
   },
});