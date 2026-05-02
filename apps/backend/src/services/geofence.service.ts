/**
 * Service for geofence-related operations
 */

import { calculateHaversineDistance, isWithinGeofence } from '../utils/haversine';
import { prisma } from '../utils/prisma';

interface GeofenceCheckParams {
  userLat: number;
  userLon: number;
  premiseLat: number;
  premiseLon: number;
  radiusMeters: number;
}

/**
 * Check if user is within a geofence
 */
export const checkGeofenceProximity = ({
  userLat,
  userLon,
  premiseLat,
  premiseLon,
  radiusMeters,
}: GeofenceCheckParams): boolean => {
  // TODO: Implement geofence validation logic
  // TODO: Consider GPS accuracy and margin
  // TODO: Log geofence checks for audit

  return isWithinGeofence(userLat, userLon, premiseLat, premiseLon, radiusMeters);
};

interface ValidateGeofenceParams {
  latitude: number;
  longitude: number;
  locationId: string;
}

export const validateGeofence = async ({
  latitude,
  longitude,
  locationId,
}: ValidateGeofenceParams) => {
  const location = await prisma.location.findFirst({
    where: {
      id: locationId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
      radiusMeters: true,
    },
  });

  if (!location) throw new Error('LOCATION_NOT_FOUND');

  const distanceM = calculateHaversineDistance(
    latitude,
    longitude,
    location.latitude,
    location.longitude
  );

  return {
    isWithinGeofence: distanceM <= location.radiusMeters,
    distanceM,
    allowedRadiusM: location.radiusMeters,
    location: {
      id: location.id,
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
    },
  };
};

export const getActiveLocations = async () => {
  return prisma.location.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
      radiusMeters: true,
    },
    orderBy: { name: 'asc' },
  });
};

export const getLocationById = async (locationId: string) => {
  const location = await prisma.location.findFirst({
    where: {
      id: locationId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
      radiusMeters: true,
      workingHours: {
        select: {
          startTime: true,
          endTime: true,
          lateThresholdMins: true,
          minDurationHours: true,
        },
      },
    },
  });

  if (!location) throw new Error('LOCATION_NOT_FOUND');

  return location;
};

/**
 * Find nearest premise to user location
 */
export const findNearestPremise = async (
  userLat: number,
  userLon: number,
  maxDistance: number = 1000 // Default 1km
) => {
  // TODO: Query all premises from database
  // TODO: Calculate distance to each premise
  // TODO: Filter by maxDistance
  // TODO: Return nearest premise or null if none found
  // TODO: Cache results for performance
};
