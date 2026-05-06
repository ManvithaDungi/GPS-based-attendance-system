/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusBadgeProps {
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'PENDING' | 'ACTIVE' | 'NONE';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getColors = () => {
    switch (status) {
      case 'PRESENT':
        return { bg: '#34C7591A', text: '#34C759', border: '#34C75933' };
      case 'ABSENT':
        return { bg: '#FF3B301A', text: '#FF3B30', border: '#FF3B3033' };
      case 'LATE':
        return { bg: '#FF9F0A1A', text: '#FF9F0A', border: '#FF9F0A33' };
      case 'PENDING':
        return { bg: '#4F8EF71A', text: '#4F8EF7', border: '#4F8EF733' };
      case 'ACTIVE':
        return { bg: '#34C7591A', text: '#34C759', border: '#34C75933' };
      case 'NONE':
        return { bg: '#8E8E931A', text: '#8E8E93', border: '#8E8E9333' };
      default:
        return { bg: '#A0AEC01A', text: '#718096', border: '#A0AEC033' };
    }
  };

  const colors = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[styles.text, { color: colors.text }]}>
        {status}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 50,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  }
});
