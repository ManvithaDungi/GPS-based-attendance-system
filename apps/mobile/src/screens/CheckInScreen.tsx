import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api';

interface LocationData {
  latitude: number;
  longitude: number;
}

interface PremiseData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export const CheckInScreen: React.FC = () => {
  const { user } = useAuth();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [nearbyPremise, setNearbyPremise] = useState<PremiseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Request location permissions
    // TODO: Get current location using expo-location
    // TODO: Call GET /api/geofence/nearby to fetch nearby premises
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      // TODO: Request foreground location permission
      // TODO: Get current location coordinates
      // TODO: Fetch nearby premises within distance
    } catch (err) {
      setError('Failed to get location');
    }
  };

  const handleCheckIn = async () => {
    if (!nearbyPremise) {
      setError('Not within any premise geofence');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Call POST /api/attendance/checkin with location and premise
      // TODO: Handle check-in success/failure
      // TODO: Show confirmation message
      // TODO: Navigate back to dashboard
    } catch (err) {
      setError('Check-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setIsLoading(true);
    try {
      // TODO: Call POST /api/attendance/checkout
      // TODO: Handle check-out success/failure
      // TODO: Show confirmation message
    } catch (err) {
      setError('Check-out failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.locationSection}>
        {/* TODO: Display current location coordinates */}
        {/* TODO: Display nearby premise information */}
        {/* TODO: Display distance to geofence */}
      </View>

      <View style={styles.actionSection}>
        {/* TODO: Check-in button */}
        {/* TODO: Check-out button */}
        {/* TODO: Show loading state during request */}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  locationSection: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 20,
  },
  actionSection: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  errorText: {
    color: '#d32f2f',
    marginTop: 10,
    textAlign: 'center',
  },
  // TODO: Add more styles
});
