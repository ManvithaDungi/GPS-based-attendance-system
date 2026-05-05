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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../theme/colors';
import { NeumorphicCard, NeumorphicButton } from '../../components/NeumorphicCard';
import { api } from '../../services/api';

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

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        logout();
      }
    } else {
      Alert.alert(
        'Logout',
        'Are you sure you want to sign out?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Logout', style: 'destructive', onPress: logout }
        ]
      );
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]} contentContainerStyle={styles.content}>
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
                <MaterialCommunityIcons 
                  name={theme === 'light' ? "moon-waning-crescent" : "white-balance-sunny"} 
                  size={20} 
                  color="#FFF" 
                />
              </View>
              <Text style={[styles.menuItemText, { color: themeColors.text }]}>Dark Mode</Text>
            </View>
            <MaterialCommunityIcons 
              name={theme === 'dark' ? "toggle-switch" : "toggle-switch-off"} 
              size={40} 
              color={theme === 'dark' ? colors.light.success : themeColors.outline} 
            />
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
              <MaterialCommunityIcons name="help-circle-outline" size={20} color="#FFF" />
            </View>
            <Text style={[styles.menuItemText, { color: themeColors.text }]}>Help Center</Text>
          </View>
        </NeumorphicCard>
      </View>

      <TouchableOpacity onPress={handleLogout} style={styles.logoutWrapper}>
        <NeumorphicButton style={styles.logoutButton}>
          <MaterialCommunityIcons name="logout" size={20} color={colors.light.error} />
          <Text style={[styles.logoutText, { color: colors.light.error }]}>Sign Out</Text>
        </NeumorphicButton>
      </TouchableOpacity>

      <Text style={[styles.version, { color: themeColors.textSecondary }]}>InDaZone Premium v1.0.4</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
    gap: 32,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    padding: 4,
    marginBottom: 8,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 56,
  },
  userName: {
    fontSize: 24,
    fontWeight: '900',
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    paddingLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '700',
  },
  infoCard: {
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  infoDivider: {
    height: 1,
    width: '100%',
  },
  logoutWrapper: {
    marginTop: 12,
  },
  logoutButton: {
    height: 56,
    gap: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '800',
  },
  version: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    opacity: 0.5,
    marginTop: -8,
  }
});
