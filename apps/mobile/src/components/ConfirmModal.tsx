import React from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';
import { NeumorphicCard, NeumorphicButton } from './NeumorphicCard';
import { rs, rvs, rms } from '../utils/responsive';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmModal: React.FC<Props> = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}) => {
  const { theme } = useTheme();
  const themeColors = colors[theme];

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <NeumorphicCard style={styles.modal}>
          <Text style={[styles.title, { color: themeColors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: themeColors.textSecondary }]}>{message}</Text>

          <View style={styles.actions}>
            <NeumorphicButton onPress={onCancel} style={styles.btn}>
              <Text style={[styles.cancelText, { color: themeColors.textSecondary }]}>{cancelLabel}</Text>
            </NeumorphicButton>

            <NeumorphicButton onPress={onConfirm} style={styles.btn}>
              <Text style={[styles.confirmText, { color: danger ? themeColors.error : themeColors.primary }]}>
                {confirmLabel}
              </Text>
            </NeumorphicButton>
          </View>
        </NeumorphicCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: rs(24),
  },
  modal: {
    width: '100%',
    maxWidth: 420,
    padding: rs(20),
    gap: rvs(14),
    borderRadius: rs(20),
  },
  title: {
    fontSize: rms(16),
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    fontSize: rms(13),
    fontWeight: '700',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: rs(12),
    marginTop: rvs(4),
  },
  btn: {
    flex: 1,
    height: rvs(50),
  },
  cancelText: {
    fontSize: rms(14),
    fontWeight: '800',
  },
  confirmText: {
    fontSize: rms(14),
    fontWeight: '900',
  },
});