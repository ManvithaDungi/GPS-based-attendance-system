/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { View, Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';
import { shadow } from '../utils/styles';

interface NeumorphicCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'raised' | 'recessed';
}

export const NeumorphicCard: React.FC<NeumorphicCardProps> = ({ 
  children, 
  style, 
  variant = 'raised' 
}) => {
  const { theme } = useTheme();
  const themeColors = colors[theme];

  return (
    <View 
      style={[
        styles.card,
        { backgroundColor: themeColors.surface },
        variant === 'raised' ? shadow(themeColors.shadowDark, { x: 8, y: 8 }, 0.5, 16, 8) : {
          // Inner shadow is not natively supported in RN without libraries
          // Using a subtle border as fallback for "recessed"
          borderWidth: 1,
          borderColor: themeColors.outline + '40',
        },
        style
      ]}
    >
      {children}
    </View>
  );
};

interface NeumorphicButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export const NeumorphicButton: React.FC<NeumorphicButtonProps> = ({ 
  children, 
  onPress, 
  style,
  disabled
}) => {
  const { theme } = useTheme();
  const themeColors = colors[theme];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        { 
          backgroundColor: themeColors.surface,
          ...shadow(themeColors.shadowDark, { x: 6, y: 6 }, 0.4, 12, 4),
        },
        disabled && { opacity: 0.5 },
        style
      ]}
    >
      {children}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 16,
  },
  button: {
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
