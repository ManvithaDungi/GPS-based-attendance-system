import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList } from 'react-native';
import { useAuth } from '../context/AuthContext';

interface StudentAttendance {
  // TODO: Import from shared types
  studentId: string;
  studentName: string;
  presentCount: number;
  absentCount: number;
  lateCount: number;
}

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [studentsData, setStudentsData] = useState<StudentAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch all students attendance summary from GET /api/admin/attendance
    // TODO: Require admin role verification
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {/* TODO: Display admin name and info */}
      </View>

      <View style={styles.statsSection}>
        {/* TODO: Display overall attendance statistics */}
        {/* Total students */}
        {/* Average attendance rate */}
      </View>

      <View style={styles.studentsListSection}>
        {/* TODO: Display list of all students and their attendance */}
        {/* TODO: Add search/filter functionality */}
        {/* TODO: Add sort functionality */}
      </View>

      <View style={styles.geofenceSection}>
        {/* TODO: Add link to geofence management */}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
  },
  statsSection: {
    padding: 20,
  },
  studentsListSection: {
    padding: 20,
  },
  geofenceSection: {
    padding: 20,
  },
  // TODO: Add more styles
});
