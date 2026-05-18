import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

declare const google: any;

interface Props {
  userLocation?: {
    latitude: number;
    longitude: number;
    heading?: number | null;
  } | null;
  geofenceLocation?: { name: string; latitude: number; longitude: number; radiusMeters: number } | null;
  isWithinGeofence?: boolean;
  interactive?: boolean;
}

// ─── Native: use react-native-maps ───────────────────────────────────────────
const NativeMap = ({ userLocation, geofenceLocation, isWithinGeofence, interactive = false }: Props) => {
  // Lazy import so web bundle never touches react-native-maps
  const MapView = require('react-native-maps').default;
  const { Circle, Marker } = require('react-native-maps');

  const region = {
    latitude: geofenceLocation?.latitude ?? userLocation?.latitude ?? -6.2088,
    longitude: geofenceLocation?.longitude ?? userLocation?.longitude ?? 106.8456,
    latitudeDelta: 0.003,
    longitudeDelta: 0.003,
  };

  return (
    <MapView
      provider="google"
      style={{ flex: 1, borderRadius: 24 }}
      region={region}
      showsUserLocation
      showsMyLocationButton={false}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      rotateEnabled={interactive}
      pitchEnabled={interactive}
    >
      {geofenceLocation && (
        <>
          <Circle
            center={{ latitude: geofenceLocation.latitude, longitude: geofenceLocation.longitude }}
            radius={geofenceLocation.radiusMeters}
            strokeWidth={2}
            strokeColor={isWithinGeofence ? '#48BB78CC' : '#ECC94BCC'}
            fillColor={isWithinGeofence ? '#48BB7825' : '#ECC94B15'}
          />
          <Marker
            coordinate={{ latitude: geofenceLocation.latitude, longitude: geofenceLocation.longitude }}
            title={geofenceLocation.name}
            pinColor={isWithinGeofence ? '#48BB78' : '#ECC94B'}
          />
        </>
      )}
    </MapView>
  );
};

// ─── Web: use Google Maps JS API directly ─────────────────────────────────────
const WebMap = ({ userLocation, geofenceLocation, isWithinGeofence, interactive = false }: Props) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);

  const center = {
    lat: userLocation?.latitude ?? geofenceLocation?.latitude ?? -6.2088,
    lng: userLocation?.longitude ?? geofenceLocation?.longitude ?? 106.8456,
  };

  // ── Load Google Maps script once ──────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // If maps is already loaded and Map is a constructor, init directly
    if ((window as any).google?.maps?.Map) {
      initMap();
      return;
    }

    // Set up the global callback
    const originalInitMap = (window as any).initMap;
    (window as any).initMap = () => {
      if (typeof originalInitMap === 'function') originalInitMap();
      initMap();
    };

    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      return; // Already injecting, it will call window.initMap when done
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    // Use callback=initMap to properly initialize after loading=async finishes, and load marker library
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY}&callback=initMap&loading=async&libraries=marker`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

  }, []);

  // ── Init map ──────────────────────────────────────────────────────────────
  const initMap = () => {
    if (!mapRef.current || !(window as any).google?.maps) return;

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center,
      zoom: 17,
      disableDefaultUI: true,
      zoomControl: interactive,
      draggable: interactive,
      gestureHandling: interactive ? 'auto' : 'none',
      scrollwheel: interactive,
      disableDoubleClickZoom: !interactive,
      mapId: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ID || 'DEMO_MAP_ID',
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    });

    updateOverlays();
  };

  const geofenceIdRef = useRef<string | null>(null);

  const updateGeofenceOverlays = () => {
    if (!mapInstanceRef.current || !(window as any).google?.maps || !geofenceLocation) return;

    const fenceCenter = {
      lat: geofenceLocation.latitude,
      lng: geofenceLocation.longitude,
    };

    if (circleRef.current) {
      circleRef.current.setCenter(fenceCenter);
      circleRef.current.setRadius(geofenceLocation.radiusMeters);
      circleRef.current.setOptions({
        strokeColor: isWithinGeofence ? '#48BB78' : '#ECC94B',
        fillColor: isWithinGeofence ? '#48BB78' : '#ECC94B',
      });
    } else {
      circleRef.current = new google.maps.Circle({
        map: mapInstanceRef.current,
        center: fenceCenter,
        radius: geofenceLocation.radiusMeters,
        strokeColor: isWithinGeofence ? '#48BB78' : '#ECC94B',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: isWithinGeofence ? '#48BB78' : '#ECC94B',
        fillOpacity: 0.12,
      });
    }

    if (markerRef.current) {
      markerRef.current.position = fenceCenter;
    } else {
      const pinElement = new (google.maps as any).marker.PinElement({
        background: isWithinGeofence ? '#48BB78' : '#ECC94B',
        borderColor: '#ffffff',
        glyphColor: '#ffffff',
      });
      markerRef.current = new (google.maps as any).marker.AdvancedMarkerElement({
        map: mapInstanceRef.current,
        position: fenceCenter,
        title: geofenceLocation.name,
        content: pinElement.element,
      });
    }

    const fenceKey = `${geofenceLocation.latitude},${geofenceLocation.longitude}`;
    if (geofenceIdRef.current !== fenceKey) {
      geofenceIdRef.current = fenceKey;
      mapInstanceRef.current.panTo(fenceCenter);
    }
  };

  const updateUserMarker = () => {
    if (!mapInstanceRef.current || !(window as any).google?.maps || !userLocation) return;

    const userPos = { lat: userLocation.latitude, lng: userLocation.longitude };

    // Create the SVG marker element
    const createMarkerElement = (heading: number = 0) => {
      const el = document.createElement('div');
      el.style.cssText = 'position: relative; width: 40px; height: 40px;';

      el.innerHTML = `
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <!-- Direction arrow (rotates with heading) -->
          <g transform="rotate(${heading}, 20, 20)">
            <polygon
              points="20,4 25,16 20,13 15,16"
              fill="#4299E1"
              opacity="0.85"
            />
          </g>
          <!-- Main dot -->
          <circle cx="20" cy="20" r="9" fill="#4299E1" />
          <circle cx="20" cy="20" r="9" fill="none" stroke="white" stroke-width="2.5" />
          <!-- Inner highlight -->
          <circle cx="20" cy="20" r="4" fill="white" opacity="0.4" />
        </svg>
      `;
      return el;
    };

    if (userMarkerRef.current) {
      userMarkerRef.current.position = userPos;
      // Update heading if you have it
      if (userLocation.heading != null) {
        const el = userMarkerRef.current.content;
        const polygon = el?.querySelector('polygon')?.closest('g');
        if (polygon) polygon.setAttribute('transform', `rotate(${userLocation.heading}, 20, 20)`);
      }
    } else {
      userMarkerRef.current = new (google.maps as any).marker.AdvancedMarkerElement({
        map: mapInstanceRef.current,
        position: userPos,
        title: 'You',
        content: createMarkerElement(userLocation.heading ?? 0),
      });
    }
  };

  const updateOverlays = () => {
    updateGeofenceOverlays();
    updateUserMarker();
  };

  useEffect(() => {
    updateGeofenceOverlays();
  }, [geofenceLocation, isWithinGeofence]);

  useEffect(() => {
    updateUserMarker();
  }, [userLocation]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    mapInstanceRef.current.setOptions({
      zoomControl: interactive,
      draggable: interactive,
      gestureHandling: interactive ? 'auto' : 'none',
      scrollwheel: interactive,
      disableDoubleClickZoom: !interactive,
    });
  }, [interactive]);

  return (
    <div
      ref={mapRef}
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
        borderRadius: 24,
        overflow: 'hidden',
        pointerEvents: interactive ? 'auto' : 'none',
      }}
    />
  );
};

// ─── Exported component — picks correct implementation per platform ────────────
export const GeofenceMap = ({ userLocation, geofenceLocation, isWithinGeofence, interactive = false }: Props) => {
  if (Platform.OS !== 'web') {
    return (
      <NativeMap
        userLocation={userLocation}
        geofenceLocation={geofenceLocation}
        isWithinGeofence={isWithinGeofence}
        interactive={interactive}
      />
    );
  }

  return (
    <WebMap
      userLocation={userLocation}
      geofenceLocation={geofenceLocation}
      isWithinGeofence={isWithinGeofence}
      interactive={interactive}
    />
  );
};
