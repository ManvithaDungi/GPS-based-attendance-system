/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import Icon from './Icon';
import { useTheme } from '../context/ThemeContext';
import { NeumorphicButton } from './NeumorphicCard';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <NeumorphicButton 
      onPress={toggleTheme}
      style={styles.button}
    >
      <Icon name={theme === 'light' ? 'moon-waning-crescent' : 'white-balance-sunny'} size={20} color={theme === 'light' ? '#4A5568' : '#FBBF24'} />
    </NeumorphicButton>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 12,
    paddingVertical: 0,
    paddingHorizontal: 0,
  }
});
