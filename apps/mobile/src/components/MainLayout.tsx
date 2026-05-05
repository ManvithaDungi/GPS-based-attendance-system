/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/student/HomeScreen';
import { Platform } from 'react-native';
import { AttendanceScreen } from '../screens/student/AttendanceScreen';
import { NotificationsScreen } from '../screens/student/NotificationsScreen';
import { ProfileScreen } from '../screens/student/ProfileScreen';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';
import { shadow } from '../utils/styles';

const Tab = createBottomTabNavigator();

export const MainLayout: React.FC = () => {
  const { theme } = useTheme();
  const themeColors = colors[theme];

  return (
    <Tab.Navigator
      id="tabs"
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: {
          backgroundColor: themeColors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: '900',
          color: themeColors.text,
        },
        tabBarStyle: {
          backgroundColor: themeColors.surface,
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 12,
          paddingTop: 12,
          ...shadow(themeColors.shadowDark, { x: 0, y: -4 }, 0.1, 10, 5),
        },
        tabBarActiveTintColor: colors.light.success,
        tabBarInactiveTintColor: themeColors.textSecondary,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof MaterialCommunityIcons.glyphMap = 'home';
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Attendance') iconName = 'calendar-check';
          else if (route.name === 'Notifications') iconName = 'bell';
          else if (route.name === 'Profile') iconName = 'account-circle';
          return <MaterialCommunityIcons name={iconName} size={size + 4} color={color} />;
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
