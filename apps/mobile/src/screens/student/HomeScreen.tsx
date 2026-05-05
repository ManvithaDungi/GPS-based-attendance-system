//File Name: HomeScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { GeofenceMap } from '../../components/GeofenceMap';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../theme/colors';
import { NeumorphicCard } from '../../components/NeumorphicCard';
import { CheckInButton } from '../../components/CheckInButton';
import { StatusBadge } from '../../components/StatusBadge';
import { shadow } from '../../utils/styles';
import { api } from '../../services/api';
import { AppHeader } from '@/src/components/AppHeader';

// ─── Types matching your API exactly ────────────────────────────────────────

interface TodayAttendance {
  id: string;
  locationId: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'PENDING';
  punctuality: 'ON_TIME' | 'LATE' | null;
  checkInTime: string | null;
  checkInLat: number | null;
  checkInLng: number | null;
  checkInAccuracyM: number | null;
  checkOutTime: string | null;
  checkOutLat: number | null;
  checkOutLng: number | null;
  checkOutAccuracyM: number | null;
  durationHours: number | null;
  isAutoClosed: boolean;
}

interface GeofenceLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  workingHours?: {
    startTime: string;
    endTime: string;
    lateThresholdMins: number;
    minDurationHours: number;
  };
}

interface GeofenceValidation {
  isWithinGeofence: boolean;
  distanceM: number;
  allowedRadiusM: number;
  location: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  };
}

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

// ─── Haversine (client-side UX only, server enforces) ────────────────────────

const haversineDistance = (
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatRemainingTime = (checkInTime: string, minDurationHours: number = 6): string => {
  const checkInDate = new Date(checkInTime).getTime();
  const expectedCheckOut = checkInDate + minDurationHours * 3600000;
  let remaining = expectedCheckOut - Date.now();

  if (remaining < 0) remaining = 0;

  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);

  const pad = (num: number) => num.toString().padStart(2, '0');

  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

// ─── Component ───────────────────────────────────────────────────────────────

export const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const themeColors = colors[theme];

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [geofenceLocation, setGeofenceLocation] = useState<GeofenceLocation | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [isWithinGeofence, setIsWithinGeofence] = useState(false);
  const [distanceM, setDistanceM] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timer, setTimer] = useState('00:00:00');
  // FIX: track whether user has tapped the map to enable map interaction
  const [mapInteractive, setMapInteractive] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Timer for active check-in ──────────────────────────────────────────────
  useEffect(() => {
    if (todayAttendance?.checkInTime && !todayAttendance?.checkOutTime) {
      const minDuration = geofenceLocation?.workingHours?.minDurationHours ?? 6;
      setTimer(formatRemainingTime(todayAttendance.checkInTime, minDuration));

      timerRef.current = setInterval(() => {
        setTimer(formatRemainingTime(todayAttendance.checkInTime!, minDuration));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [todayAttendance?.checkInTime, todayAttendance?.checkOutTime, geofenceLocation]);

  // ── Fetch geofence location (first active location) ───────────────────────
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const res = await api.get<{ data: GeofenceLocation[] }>('/geofence/locations');
        if (res.data.data.length > 0) {
          setGeofenceLocation(res.data.data[0]);
        }
      } catch (err) {
        console.error('Failed to fetch geofence locations', err);
      }
    };
    fetchLocation();
  }, []);

  // ── Fetch today's attendance ──────────────────────────────────────────────
  const fetchToday = async () => {
    try {
      const res = await api.get<TodayAttendance>('/attendance/today');
      setTodayAttendance(res.data);
    } catch (err: any) {
      // 404 = no attendance today, that's fine
      if (err.response?.status !== 404) {
        console.error('Failed to fetch today attendance', err);
      }
      setTodayAttendance(null);
    }
  };

  useEffect(() => {
    fetchToday();
  }, []);

  // ── Get user's GPS location ───────────────────────────────────────────────
  useEffect(() => {
    const startTracking = async () => {
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          setLocationError('Geolocation not supported');
          setIsLoading(false);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            });
            setLocationError(null);
            setIsLoading(false);
          },
          (err) => {
            setLocationError('Location access denied');
            setIsLoading(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );

        // Poll every 10s on web
        locationRef.current = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setUserLocation({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
              });
            },
            () => { }
          );
        }, 10000);
      } else {
        // Native — use expo-location
        const ExpoLocation = await import('expo-location');
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Location permission denied');
          setIsLoading(false);
          return;
        }
        const pos = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.High,
        });
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setIsLoading(false);
      }
    };

    startTracking();
    return () => {
      if (locationRef.current) clearInterval(locationRef.current);
    };
  }, []);

  // ── Compute geofence distance client-side (UX only) ───────────────────────
  useEffect(() => {
    if (userLocation && geofenceLocation) {
      const d = haversineDistance(
        userLocation.latitude, userLocation.longitude,
        geofenceLocation.latitude, geofenceLocation.longitude
      );
      setDistanceM(d);
      setIsWithinGeofence(d <= geofenceLocation.radiusMeters);
    }
  }, [userLocation, geofenceLocation]);

  // ── Determine screen state ─────────────────────────────────────────────────
  const getStatus = (): 'outside' | 'available' | 'checked-in' | 'completed' => {
    if (todayAttendance?.checkOutTime) return 'completed';
    if (todayAttendance?.checkInTime) return 'checked-in';
    if (isWithinGeofence) return 'available';
    return 'outside';
  };

  // ── Check-in / Check-out ──────────────────────────────────────────────────
  const handleAction = async (retryCount = 0) => {
    if (!userLocation || !geofenceLocation) return;

    const status = getStatus();
    if (status !== 'available' && status !== 'checked-in') return;

    setIsProcessing(true);
    try {
      const payload = {
        lat: userLocation.latitude,
        lng: userLocation.longitude,
        timestamp: new Date().toISOString(),
        locationId: geofenceLocation.id,
        accuracyMeters: userLocation.accuracy ?? 10,
      };

      if (status === 'available') {
        const res = await api.post<{ message: string; attendance: TodayAttendance }>(
          '/attendance/checkin',
          payload
        );
        setTodayAttendance(res.data.attendance);
      } else {
        const res = await api.post<{ message: string; attendance: TodayAttendance }>(
          '/attendance/checkout',
          payload
        );
        setTodayAttendance(res.data.attendance);
      }
    } catch (err: any) {
      const code = err.response?.status;
      const errorStr = err.response?.data?.error;
      const messageStr = err.response?.data?.message;

      if (code === 403) {
        Alert.alert('Access Denied', 'You do not have permission to perform this action.');
      } else if (code === 400 && errorStr === 'OUTSIDE_GEOFENCE') {
        Alert.alert('Outside Geofence', `You are ${distanceM ? distanceM.toFixed(0) : '?'}m away from the zone.`);
      } else if (code === 400 && errorStr === 'STALE_TIMESTAMP') {
        if (retryCount < 2) {
          handleAction(retryCount + 1);
          return;
        }
        Alert.alert('Error', 'Timestamp stale after retries.');
      } else if (code === 400 && errorStr === 'LOW_GPS_ACCURACY') {
        Alert.alert('Low GPS Accuracy', 'Please move to an open area and try again.');
      } else if (code === 409 && errorStr === 'ALREADY_CHECKED_IN') {
        fetchToday();
        Alert.alert('Already Checked In', 'You are already checked in. Refreshing state...');
      } else {
        const msg = messageStr || errorStr || 'Something went wrong';
        Alert.alert('Error', msg);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Map region ─────────────────────────────────────────────────────────────
  const mapRegion = {
    latitude: geofenceLocation?.latitude ?? userLocation?.latitude ?? -6.2088,
    longitude: geofenceLocation?.longitude ?? userLocation?.longitude ?? 106.8456,
    latitudeDelta: 0.003,
    longitudeDelta: 0.003,
  };

  // ── Duration display ───────────────────────────────────────────────────────
  const durationDisplay = (() => {
    const s = getStatus();
    if (s === 'checked-in') return timer;
    if (s === 'completed' && todayAttendance?.durationHours != null) {
      const h = Math.floor(todayAttendance.durationHours);
      const m = Math.floor((todayAttendance.durationHours - h) * 60);
      const secs = Math.round((((todayAttendance.durationHours - h) * 60) - m) * 60);
      const pad = (num: number) => num.toString().padStart(2, '0');
      return `${pad(h)}:${pad(m)}:${pad(secs)}`;
    }
    return '00:00:00';
  })();

  return (
    <View style={[styles.container, styles.content, { backgroundColor: themeColors.background }]}> 
      <AppHeader />

      {/* ── Map Section ───────────────────────────────────────────────────── */}
      <View style={styles.mapWrapper}>
        <View
          style={[
            styles.mapContainer,
            { backgroundColor: themeColors.surface },
          ]}
        >
          {isLoading ? (
            <View style={styles.mapPlaceholder}>
              <ActivityIndicator color={themeColors.primary} size="large" />
              <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
                Acquiring location...
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1 }} pointerEvents={mapInteractive ? 'auto' : 'none'}>
              <GeofenceMap
                userLocation={userLocation}
                geofenceLocation={geofenceLocation}
                isWithinGeofence={isWithinGeofence}
                interactive={mapInteractive}
              />
            </View>
          )}

          {/* Distance tag */}
          {!isLoading && (
            <View style={[styles.locationTag, { backgroundColor: themeColors.background + 'EE' }]}>
              <MaterialCommunityIcons
                name="map-marker-radius"
                size={16}
                color={isWithinGeofence ? '#48BB78' : '#ECC94B'}
              />
              <Text
                style={[
                  styles.locationTagText,
                  { color: isWithinGeofence ? '#48BB78' : '#D69E2E' },
                ]}
              >
                {distanceM != null
                  ? `${distanceM.toFixed(0)}m from zone`
                  : geofenceLocation?.name ?? 'Locating...'}
              </Text>
            </View>
          )}

          {!isLoading && !mapInteractive && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.mapHint}
              onPress={() => setMapInteractive(true)}
            >
              <MaterialCommunityIcons name="gesture-tap" size={14} color="#fff" />
              <Text style={styles.mapHintText}>Interact</Text>
            </TouchableOpacity>
          )}

          {!isLoading && mapInteractive && (
            <TouchableOpacity
              style={styles.mapDismiss}
              onPress={() => setMapInteractive(false)}
            >
              <MaterialCommunityIcons name="close-circle" size={18} color="#fff" />
              <Text style={styles.mapDismissText}>Done</Text>
            </TouchableOpacity>
          )}

          {locationError && (
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons name="alert-circle" size={14} color="#C53030" />
              <Text style={styles.errorText}>{locationError}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Check-in Button ───────────────────────────────────────────────── */}
      <View style={styles.buttonSection}>
        <CheckInButton
          status={getStatus()}
          onPress={handleAction}
          isLoading={isProcessing}
        />
      </View>

      {/* ── Stats Row ─────────────────────────────────────────────────────── */}
      <View style={styles.statsGrid}>
        <NeumorphicCard variant="recessed" style={styles.statCard}>
          <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>STATUS</Text>
          <StatusBadge status={todayAttendance?.status ?? 'ABSENT'} />
        </NeumorphicCard>

        <NeumorphicCard style={styles.statCard}>
          <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>CHECK-IN</Text>
          <Text style={[styles.statValue, { color: themeColors.text }]}>
            {todayAttendance?.checkInTime
              ? new Date(todayAttendance.checkInTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
              : '--:--'}
          </Text>
        </NeumorphicCard>

        <NeumorphicCard style={styles.statCard}>
          <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>DURATION</Text>
          <Text style={[styles.statValue, { color: themeColors.text }]}>{durationDisplay}</Text>
        </NeumorphicCard>
      </View>

      {/* ── Punctuality badge (shows after check-in) ──────────────────────── */}
      {todayAttendance?.punctuality && (
        <NeumorphicCard style={styles.punctualityCard}>
          <MaterialCommunityIcons
            name={todayAttendance.punctuality === 'ON_TIME' ? 'check-circle' : 'clock-alert'}
            size={20}
            color={todayAttendance.punctuality === 'ON_TIME' ? '#48BB78' : '#ECC94B'}
          />
          <Text style={[styles.punctualityText, { color: themeColors.text }]}>
            {todayAttendance.punctuality === 'ON_TIME' ? 'On Time' : 'Marked Late'}
          </Text>
        </NeumorphicCard>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingTop: 0, gap: 12 },
  mapWrapper: {
    alignItems: 'center',
  },

  mapContainer: {
    width: '88%',
    height: 250,
    borderRadius: 28,
    padding: 8,
    overflow: 'hidden',

    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  map: { flex: 1, borderRadius: 24 },
  mapPlaceholder: {
    flex: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 13, fontWeight: '600' },

  mapHint: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  mapHintText: { fontSize: 11, fontWeight: '600', color: '#fff' },

  // Dismiss button shown when map is interactive
  mapDismiss: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  mapDismissText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  locationTag: {
    position: 'absolute',
    top: 24,
    left: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  locationTagText: { fontSize: 12, fontWeight: '700' },
  errorBanner: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: '#FED7D7',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: { fontSize: 10, fontWeight: '700', color: '#9B2C2C', flex: 1 },
  buttonSection: { alignItems: 'center' },
  statsGrid: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 8,
  },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  statValue: { fontSize: 14, fontWeight: '900' },
  punctualityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  punctualityText: { fontSize: 14, fontWeight: '700' },
});
