/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from './Icon';
import { HomeScreen } from '../screens/student/HomeScreen';
import { AttendanceScreen } from '../screens/student/AttendanceScreen';
import { NotificationsScreen } from '../screens/student/NotificationsScreen';
import { ProfileScreen } from '../screens/student/ProfileScreen';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';
import { rs, rvs, rms } from '../utils/responsive'; // ← responsive helpers

const Tab = createBottomTabNavigator();

export const MainLayout: React.FC = () => {
  const { theme } = useTheme();
  const themeColors = colors[theme];

  return (
    <Tab.Navigator
      id="tabs"
      screenOptions={({ route }) => ({

        headerShown: false,

        tabBarStyle: {
          position: 'absolute',
          left: rs(20),
          right: rs(20),
          bottom: rvs(20),
          height: rvs(65),
          borderRadius: rs(20),
          backgroundColor: themeColors.surface,
          borderTopWidth: 0,
          paddingBottom: rvs(8),
          paddingTop: rvs(8),

          shadowColor: '#000',
          shadowOffset: { width: 6, height: 6 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 10,
        },

        tabBarActiveTintColor: colors.light.success,
        tabBarInactiveTintColor: themeColors.textSecondary,

        tabBarIcon: ({ color }) => {
          let iconName = 'home';

          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Attendance') iconName = 'calendar-check';
          else if (route.name === 'Notifications') iconName = 'bell';
          else if (route.name === 'Profile') iconName = 'account-circle';

          return <Icon name={iconName} size={rs(22)} color={color} />;
        },

        tabBarLabelStyle: {
          fontSize: rms(11),
          fontWeight: '600',
        },

        tabBarItemStyle: {
          paddingVertical: rvs(4),
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};