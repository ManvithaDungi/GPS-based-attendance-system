import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../theme/colors';
import { NeumorphicCard } from '../../components/NeumorphicCard';
import { api } from '../../services/api';

export const AdminDashboardScreen: React.FC = () => {
  const { theme } = useTheme();
  const themeColors = colors[theme];
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/admin/dashboard');
      setStats(response.data);
    } catch (e) {
      console.error('Failed to fetch admin dashboard', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={colors.light.success} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: themeColors.text }]}>Admin Dashboard</Text>
      
      <View style={styles.statsGrid}>
        <NeumorphicCard style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.light.primary }]}>{stats?.totalStudents || 0}</Text>
          <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>TOTAL STUDENTS</Text>
        </NeumorphicCard>
        <NeumorphicCard style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.light.success }]}>{stats?.presentToday || 0}</Text>
          <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>PRESENT TODAY</Text>
        </NeumorphicCard>
        <NeumorphicCard style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.light.warning }]}>{stats?.lateToday || 0}</Text>
          <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>LATE TODAY</Text>
        </NeumorphicCard>
        <NeumorphicCard style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.light.error }]}>{stats?.totalLocations || 0}</Text>
          <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>LOCATIONS</Text>
        </NeumorphicCard>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, gap: 24 },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  statCard: { width: '47%', height: 120, justifyContent: 'center', alignItems: 'center', gap: 8 },
  statValue: { fontSize: 32, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
});
