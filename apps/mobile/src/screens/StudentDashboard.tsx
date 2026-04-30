import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';

interface AttendanceData {
  // TODO: Import from shared types
  present: number;
  absent: number;
  late: number;
}

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch student attendance summary from GET /api/attendance/me
    // TODO: Handle loading and error states
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {/* TODO: Display student name and info */}
      </View>

      <View style={styles.statsSection}>
        {/* TODO: Display attendance statistics */}
        {/* Present count */}
        {/* Absent count */}
        {/* Late count */}
      </View>

      <View style={styles.attendanceListSection}>
        {/* TODO: Display list of recent attendance records */}
        {/* TODO: Add pull-to-refresh functionality */}
      </View>

      <View style={styles.checkInSection}>
        {/* TODO: Add check-in button that navigates to CheckInScreen */}
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
  attendanceListSection: {
    padding: 20,
  },
  checkInSection: {
    padding: 20,
  },
  // TODO: Add more styles
});
