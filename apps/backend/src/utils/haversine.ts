/**
 * Utility: Haversine formula for calculating distance between two coordinates
 * Returns distance in meters
 */
export const calculateHaversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers

  const toRad = (value: number) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c * 1000;

  return d;
};

/**
 * Check if coordinates are within geofence radius
 */
export const isWithinGeofence = (
  userLat: number,
  userLon: number,
  premiseLat: number,
  premiseLon: number,
  radiusMeters: number
): boolean => {
  const distance = calculateHaversineDistance(userLat, userLon, premiseLat, premiseLon);
  return distance <= radiusMeters;
};
