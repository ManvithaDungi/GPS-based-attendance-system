/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { api } from '../services/api';

export interface LocationState {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  distanceFromCenter: number | null;
  isInside: boolean;
}

export const useLocation = () => {
  const [location, setLocation] = useState<LocationState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [geofence, setGeofence] = useState<{ center: { lat: number, lng: number }, radius: number } | null>(null);

  useEffect(() => {
    const fetchGeofence = async () => {
      try {
        const response = await api.get('/geofence/locations');
        setGeofence(response.data[0]);
      } catch (e) {
        console.error('Failed to fetch geofence', e);
      }
    };
    fetchGeofence();
  }, []);

  useEffect(() => {
    let subscription: Location.LocationSubscription;

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access location was denied');
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 1,
        },
        async (position) => {
          const { latitude, longitude, accuracy, speed } = position.coords;
          
          try {
            const validateResponse = await api.get('/geofence/validate', {
              params: { lat: latitude, lng: longitude }
            });
            
            setLocation({
              latitude,
              longitude,
              accuracy: accuracy || null,
              speed: speed || null,
              distanceFromCenter: validateResponse.data.distance,
              isInside: validateResponse.data.isInside
            });
          } catch (e) {
            if (geofence) {
              const dist = calculateDistance(latitude, longitude, geofence.center.lat, geofence.center.lng);
              setLocation({
                latitude,
                longitude,
                accuracy: accuracy || null,
                speed: speed || null,
                distanceFromCenter: dist,
                isInside: dist <= geofence.radius
              });
            }
          }
        }
      );
    })();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [geofence]);

  return { location, error };
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
}
