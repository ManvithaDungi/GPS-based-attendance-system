/**
 * Service for geofence-related operations
 */

import { calculateHaversineDistance, isWithinGeofence } from '../utils/haversine';
import { prisma } from '../utils/prisma';
import { invalidateLocationCache } from '../cache/geofence.cache';

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

export const getActiveLocations = async (page: number = 1, limit: number = 50) => {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 50;
  const cappedLimit = Math.min(Math.max(safeLimit, 1), 200);
  const skip = (safePage - 1) * cappedLimit;

  const where = { deletedAt: null as Date | null };

  const [data, total] = await Promise.all([
    prisma.location.findMany({
      where,
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        radiusMeters: true,
      },
      orderBy: { name: 'asc' },
      skip,
      take: cappedLimit,
    }),
    prisma.location.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page: safePage,
      limit: cappedLimit,
      total,
      totalPages: Math.ceil(total / cappedLimit),
    },
  };
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

const locationWithWorkingHoursSelect = {
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
};

export const createLocation = async (data: {
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  workingHours?: { startTime: string; endTime: string; lateThresholdMins?: number; minDurationHours?: number };
}) => {
  return prisma.location.create({
    data: {
      name: data.name,
      latitude: data.latitude,
      longitude: data.longitude,
      radiusMeters: data.radiusMeters,
      ...(data.workingHours && {
        workingHours: { create: data.workingHours },
      }),
    },
    select: locationWithWorkingHoursSelect,
  });
};

export const updateLocation = async (
  locationId: string,
  data: { name?: string; latitude?: number; longitude?: number; radiusMeters?: number; workingHours?: { startTime: string; endTime: string; lateThresholdMins?: number; minDurationHours?: number } }
) => {
  const existing = await prisma.location.findFirst({ where: { id: locationId, deletedAt: null } });
  if (!existing) throw new Error('LOCATION_NOT_FOUND');

  const result = await prisma.location.update({
    where: { id: locationId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.latitude !== undefined && { latitude: data.latitude }),
      ...(data.longitude !== undefined && { longitude: data.longitude }),
      ...(data.radiusMeters !== undefined && { radiusMeters: data.radiusMeters }),
      ...(data.workingHours && {
        workingHours: {
          upsert: { create: data.workingHours, update: data.workingHours },
        },
      }),
    },
    select: locationWithWorkingHoursSelect,
  });

  await invalidateLocationCache(locationId);
  return result;
};

export const softDeleteLocation = async (locationId: string) => {
  const existing = await prisma.location.findFirst({ where: { id: locationId, deletedAt: null } });
  if (!existing) throw new Error('LOCATION_NOT_FOUND');

  await prisma.location.update({
    where: { id: locationId },
    data: { deletedAt: new Date() },
  });

  await invalidateLocationCache(locationId);
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
