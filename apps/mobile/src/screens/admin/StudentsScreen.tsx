import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../theme/colors';
import { NeumorphicCard } from '../../components/NeumorphicCard';
import { api } from '../../services/api';

export const StudentsScreen: React.FC = () => {
  const { theme } = useTheme();
  const themeColors = colors[theme];
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await api.get('/admin/students');
      setStudents(response.data.data || []);
    } catch (e) {
      console.error('Failed to fetch students', e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.patch(`/admin/students/${id}/status`, { status: newStatus });
      setStudents(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update status');
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
      <Text style={[styles.title, { color: themeColors.text }]}>Manage Students</Text>

      {students.map((student) => (
        <NeumorphicCard key={student.id} style={styles.card}>
          <View>
            <Text style={[styles.name, { color: themeColors.text }]}>{student.name}</Text>
            <Text style={[styles.email, { color: themeColors.textSecondary }]}>{student.email}</Text>
          </View>
          <TouchableOpacity onPress={() => toggleStatus(student.id, student.status)}>
            <Text style={[
              styles.status,
              { color: student.status === 'ACTIVE' ? colors.light.success : colors.light.error }
            ]}>
              {student.status}
            </Text>
          </TouchableOpacity>
        </NeumorphicCard>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: '900', marginBottom: 16 },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  name: { fontSize: 16, fontWeight: '700' },
  email: { fontSize: 12, marginTop: 4 },
  status: { fontSize: 12, fontWeight: '900' },
});
