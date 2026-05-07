/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform
} from 'react-native';
import Icon from '../../components/Icon';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../theme/colors';
import { NeumorphicCard, NeumorphicButton } from '../../components/NeumorphicCard';
import { api } from '../../services/api';
import { ConfirmModal } from '../../components/ConfirmModal';
import { rs, rvs, rms } from '../../utils/responsive';

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const themeColors = colors[theme];
  const [profile, setProfile] = React.useState<any>(null);

  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/auth/me');
        setProfile(response.data);
      } catch (e) {
        console.error('Failed to fetch profile', e);
      }
    };
    fetchProfile();
  }, []);

  const [showModal, setShowModal] = React.useState(false);

  const handleLogout = () => setShowModal(true);

  const confirmLogout = () => {
    setShowModal(false);
    logout();
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={[styles.container, { backgroundColor: themeColors.background }]}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <NeumorphicCard style={styles.avatarContainer}>
            <Image
              source={{ uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}` }}
              style={styles.avatar}
            />
          </NeumorphicCard>
          <Text style={[styles.userName, { color: themeColors.text }]}>{user?.name || 'Student Name'}</Text>
          <Text style={[styles.userEmail, { color: themeColors.textSecondary }]}>{user?.email}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Settings</Text>

          <TouchableOpacity onPress={toggleTheme}>
            <NeumorphicCard style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: theme === 'light' ? '#718096' : '#FFD700' }]}>
                  <Icon name={theme === 'light' ? 'moon-waning-crescent' : 'white-balance-sunny'} size={rs(20)} color="#FFF" />
                </View>
                <Text style={[styles.menuItemText, { color: themeColors.text }]}>Dark Mode</Text>
              </View>
              <Icon name={theme === 'dark' ? 'toggle-switch' : 'toggle-switch-off'} size={rs(40)} color={theme === 'dark' ? colors.light.success : themeColors.outline} />
            </NeumorphicCard>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Account Info</Text>
          <NeumorphicCard style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>Student Code</Text>
              <Text style={[styles.infoValue, { color: themeColors.text }]}>{profile?.studentCode || '--'}</Text>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: themeColors.outline + '40' }]} />
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>Status</Text>
              <Text style={[styles.infoValue, { color: themeColors.text }]}>{profile?.status || '--'}</Text>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: themeColors.outline + '40' }]} />
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>Joined</Text>
              <Text style={[styles.infoValue, { color: themeColors.text }]}>
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '--'}
              </Text>
            </View>
          </NeumorphicCard>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Support</Text>
          <NeumorphicCard style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#A0AEC0' }]}>
                <Icon name="help-circle-outline" size={rs(20)} color="#FFF" />
              </View>
              <Text style={[styles.menuItemText, { color: themeColors.text }]}>Help Center</Text>
            </View>
          </NeumorphicCard>
        </View>

        <View style={styles.logoutWrapper}>
          <NeumorphicButton onPress={handleLogout} style={styles.logoutButton}>
            <Icon name="logout" size={rs(20)} color={colors.light.error} />
            <Text style={[styles.logoutText, { color: colors.light.error }]}>Sign Out</Text>
          </NeumorphicButton>
        </View>

        <Text style={[styles.version, { color: themeColors.textSecondary }]}>
          InDaZone Premium v1.0.4
        </Text>
      </ScrollView>

      <ConfirmModal
        visible={showModal}
        message="Are you sure you want to sign out?"
        onCancel={() => setShowModal(false)}
        onConfirm={confirmLogout}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: rs(24),
    paddingBottom: rvs(40),
    gap: rs(32),
  },
  header: {
    alignItems: 'center',
    gap: rvs(8),
  },
  avatarContainer: {
    width: rs(120),
    height: rs(120),
    borderRadius: rs(60),
    padding: rs(4),
    marginBottom: rvs(8),
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: rs(56),
  },
  userName: { fontSize: rms(24), fontWeight: '900' },
  userEmail: { fontSize: rms(14), fontWeight: '600' },
  section: { gap: rs(12) },
  sectionTitle: {
    fontSize: rms(12),
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    paddingLeft: rs(4),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rs(16),
    paddingVertical: rvs(12),
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
  },
  iconBox: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: { fontSize: rms(16), fontWeight: '700' },
  infoCard: { padding: rs(16), gap: rvs(12) },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: { fontSize: rms(14), fontWeight: '600' },
  infoValue: { fontSize: rms(14), fontWeight: '800' },
  infoDivider: { height: 1, width: '100%' },
  logoutWrapper: { marginTop: rvs(12) },
  logoutButton: { height: rvs(56), gap: rs(10) },
  logoutText: { fontSize: rms(16), fontWeight: '800' },
  version: {
    textAlign: 'center',
    fontSize: rms(10),
    fontWeight: '700',
    opacity: 0.5,
    marginTop: rvs(-8),
  }
});