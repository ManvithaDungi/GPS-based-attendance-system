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
import Icon from '../../components/Icon';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../theme/colors';
import { NeumorphicCard } from '../../components/NeumorphicCard';
import { CheckInButton } from '../../components/CheckInButton';
import { StatusBadge } from '../../components/StatusBadge';
import { shadow } from '../../utils/styles';
import { api } from '../../services/api';
import { AppHeader } from '@/src/components/AppHeader';
import { rs, rvs, rms } from '../../utils/responsive';
import { ConfirmModal } from '../../components/ConfirmModal';

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
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [timer, setTimer] = useState('00:00:00');
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
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [todayAttendance?.checkInTime, todayAttendance?.checkOutTime, geofenceLocation]);

  // ── Fetch geofence locations ──────────────────────────────────────────────
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const res = await api.get<{ data: GeofenceLocation[] }>('/geofence/locations');
        const locations = res.data.data;
        if (locations.length === 0) return;
        if (locations.length === 1) { setGeofenceLocation(locations[0]); return; }

        const pickNearest = (lat: number, lng: number) => {
          let nearest = locations[0];
          let minDist = haversineDistance(lat, lng, locations[0].latitude, locations[0].longitude);
          for (let i = 1; i < locations.length; i++) {
            const d = haversineDistance(lat, lng, locations[i].latitude, locations[i].longitude);
            if (d < minDist) { minDist = d; nearest = locations[i]; }
          }
          setGeofenceLocation(nearest);
        };

        if (Platform.OS === 'web') {
          navigator.geolocation.getCurrentPosition(
            (pos) => pickNearest(pos.coords.latitude, pos.coords.longitude),
            () => setGeofenceLocation(locations[0]),
            { enableHighAccuracy: true, timeout: 10000 }
          );
        } else {
          try {
            const ExpoLocation = await import('expo-location');
            const pos = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.High });
            pickNearest(pos.coords.latitude, pos.coords.longitude);
          } catch {
            setGeofenceLocation(locations[0]);
          }
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
      const res = await api.get<TodayAttendance | null>('/attendance/today');
      setTodayAttendance(res.data);
    } catch (err: any) {
      console.error('Failed to fetch today attendance', err);
      setTodayAttendance(null);
    }
  };

  useEffect(() => { fetchToday(); }, []);

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
            setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy });
            setLocationError(null);
            setIsLoading(false);
          },
          () => { setLocationError('Location access denied'); setIsLoading(false); },
          { enableHighAccuracy: true, timeout: 10000 }
        );
        locationRef.current = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (pos) => setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
            () => { }
          );
        }, 10000);
      } else {
        const ExpoLocation = await import('expo-location');
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Location permission denied');
          setIsLoading(false);
          return;
        }
        const pos = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.High });
        setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setIsLoading(false);
      }
    };
    startTracking();
    return () => { if (locationRef.current) clearInterval(locationRef.current); };
  }, []);

  // ── Compute geofence distance ─────────────────────────────────────────────
  useEffect(() => {
    if (userLocation && geofenceLocation) {
      const d = haversineDistance(userLocation.latitude, userLocation.longitude, geofenceLocation.latitude, geofenceLocation.longitude);
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
        const res = await api.post<{ message: string; attendance: TodayAttendance }>('/attendance/checkin', payload);
        setTodayAttendance(res.data.attendance);
      } else {
        const res = await api.post<{ message: string; attendance: TodayAttendance }>('/attendance/checkout', payload);
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
        if (retryCount < 2) { handleAction(retryCount + 1); return; }
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

  const onPressAction = () => {
    const status = getStatus();
    if (status === 'checked-in') {
      setShowCheckoutConfirm(true);
      return;
    }
    handleAction();
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
        <View style={[styles.mapContainer, { backgroundColor: themeColors.surface }]}>
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

          {!isLoading && (
            <View style={[styles.locationTag, { backgroundColor: themeColors.background + 'EE' }]}>
              <Icon name="map-marker-radius" size={rs(16)} color={isWithinGeofence ? '#48BB78' : '#ECC94B'} />
              <Text style={[styles.locationTagText, { color: isWithinGeofence ? '#48BB78' : '#D69E2E' }]}>
                {distanceM != null ? `${distanceM.toFixed(0)}m from zone` : geofenceLocation?.name ?? 'Locating...'}
              </Text>
            </View>
          )}

          {!isLoading && !mapInteractive && (
            <TouchableOpacity activeOpacity={0.8} style={styles.mapHint} onPress={() => setMapInteractive(true)}>
              <Icon name="gesture-tap" size={rs(14)} color="#fff" />
              <Text style={styles.mapHintText}>Interact</Text>
            </TouchableOpacity>
          )}

          {!isLoading && mapInteractive && (
            <TouchableOpacity style={styles.mapDismiss} onPress={() => setMapInteractive(false)}>
              <Icon name="close-circle" size={rs(18)} color="#fff" />
              <Text style={styles.mapDismissText}>Done</Text>
            </TouchableOpacity>
          )}

          {locationError && (
            <View style={styles.errorBanner}>
              <Icon name="alert-circle" size={rs(14)} color="#C53030" />
              <Text style={styles.errorText}>{locationError}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Check-in Button ───────────────────────────────────────────────── */}
      <View style={styles.buttonSection}>
        <CheckInButton status={getStatus()} onPress={onPressAction} isLoading={isProcessing} />
      </View>

      <ConfirmModal
        visible={showCheckoutConfirm}
        title="Confirm check-out"
        message="Are you sure you want to check out?"
        confirmLabel="Check out"
        onCancel={() => setShowCheckoutConfirm(false)}
        onConfirm={() => {
          setShowCheckoutConfirm(false);
          handleAction();
        }}
      />

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
              ? new Date(todayAttendance.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '--:--'}
          </Text>
        </NeumorphicCard>

        <NeumorphicCard style={styles.statCard}>
          <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>DURATION</Text>
          <Text style={[styles.statValue, { color: themeColors.text }]}>{durationDisplay}</Text>
        </NeumorphicCard>
      </View>

      {/* ── Punctuality badge ──────────────────────────────────────────────── */}
      {todayAttendance?.punctuality && (
        <NeumorphicCard style={styles.punctualityCard}>
          <Icon
            name={todayAttendance.punctuality === 'ON_TIME' ? 'check-circle' : 'clock-alert'}
            size={rs(20)}
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
  content: { padding: rs(24), paddingTop: 0, gap: rs(12) },
  mapWrapper: { alignItems: 'center' },
  mapContainer: {
    width: '88%',
    height: rvs(300),
    borderRadius: rs(28),
    padding: rs(8),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  map: { flex: 1, borderRadius: rs(24) },
  mapPlaceholder: {
    flex: 1,
    borderRadius: rs(24),
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(12),
  },
  loadingText: { fontSize: rms(13), fontWeight: '600' },
  mapHint: {
    position: 'absolute',
    bottom: rs(16),
    right: rs(16),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: rs(10),
    paddingVertical: rvs(5),
    borderRadius: rs(12),
  },
  mapHintText: { fontSize: rms(11), fontWeight: '600', color: '#fff' },
  mapDismiss: {
    position: 'absolute',
    bottom: rs(16),
    right: rs(16),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: rs(10),
    paddingVertical: rvs(5),
    borderRadius: rs(12),
  },
  mapDismissText: { fontSize: rms(11), fontWeight: '700', color: '#fff' },
  locationTag: {
    position: 'absolute',
    top: rs(24),
    left: rs(24),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(12),
    paddingVertical: rvs(8),
    borderRadius: rs(20),
    gap: rs(6),
  },
  locationTagText: { fontSize: rms(12), fontWeight: '700' },
  errorBanner: {
    position: 'absolute',
    bottom: rs(24),
    left: rs(24),
    right: rs(24),
    backgroundColor: '#FED7D7',
    padding: rs(12),
    borderRadius: rs(12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  errorText: { fontSize: rms(10), fontWeight: '700', color: '#9B2C2C', flex: 1 },
  buttonSection: { alignItems: 'center' },
  statsGrid: { flexDirection: 'row', gap: rs(8) },
  statCard: {
    flex: 1,
    height: rvs(70),
    alignItems: 'center',
    justifyContent: 'center',
    gap: rvs(4),
    padding: rs(8),
  },
  statLabel: { fontSize: rms(10), fontWeight: '700', letterSpacing: 1 },
  statValue: { fontSize: rms(14), fontWeight: '900' },
  punctualityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(8),
    paddingVertical: rvs(14),
  },
  punctualityText: { fontSize: rms(14), fontWeight: '700' },
});