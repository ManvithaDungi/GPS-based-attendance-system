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
  const R = 6371000; // Earth's radius in meters

  // TODO: Implement haversine formula
  // Convert lat/lon to radians
  // Calculate distance using formula: a = sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlon/2)
  // c = 2 * atan2(√a, √(1−a))
  // d = R * c

  return 0; // Placeholder
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
