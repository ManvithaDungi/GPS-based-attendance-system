/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';
import { shadow } from '../utils/styles';

interface CheckInButtonProps {
  status: 'outside' | 'available' | 'checked-in' | 'completed';
  onPress: () => void;
  isLoading?: boolean;
}

export const CheckInButton: React.FC<CheckInButtonProps> = ({ status, onPress, isLoading }) => {
  const { theme } = useTheme();
  const themeColors = colors[theme];

  const getConfig = () => {
    switch (status) {
      case 'outside':
        return {
          color: '#A0AEC0',
          text: 'OUTSIDE ZONE',
          disabled: true,
          icon: 'map-marker-off-outline'
        };
      case 'available':
        return {
          color: '#48BB78',
          text: 'CHECK IN',
          disabled: false,
          icon: 'login-variant'
        };
      case 'checked-in':
        return {
          color: '#ECC94B',
          text: 'CHECK OUT',
          disabled: false,
          icon: 'logout-variant'
        };
      case 'completed':
        return {
          color: '#A0AEC0',
          text: 'DONE',
          disabled: true,
          icon: 'check-circle-outline'
        };
    }
  };

  const config = getConfig();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        disabled={config.disabled || isLoading}
        style={[
          styles.button,
          { 
            backgroundColor: themeColors.surface,
            ...shadow(themeColors.shadowDark, { x: 10, y: 10 }, 0.5, 20, 10)
          }
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={config.color} />
        ) : (
          <View style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: config.color + '15' }]}>
              <MaterialCommunityIcons name={config.icon as any} size={32} color={config.color} />
            </View>
            <Text style={[styles.buttonText, { color: config.color }]}> 
              {config.text}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      
      <Text style={[styles.statusHint, { color: themeColors.textSecondary }]}> 
        {status === 'outside' ? 'Not in Zone' : 'Inside designated attendance zone'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 16,
  },
  button: {
    width: 130,
    height: 130,
    borderRadius: 65,
    justifyContent: 'center',
    alignItems: 'center',
    // shadow handled dynamically in render
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statusHint: {
    fontSize: 13,
    fontWeight: '600',
  }
});
