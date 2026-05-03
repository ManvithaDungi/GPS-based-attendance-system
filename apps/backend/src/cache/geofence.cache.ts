import { getRedisClient } from '../utils/redis';
import { prisma } from '../utils/prisma';

const CACHE_PREFIX = 'geofence:location:';
const CACHE_TTL_SECONDS = 600; // 10 minutes

export interface CachedLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  workingHours: {
    startTime: string;
    endTime: string;
    lateThresholdMins: number;
    minDurationHours: number;
  } | null;
}

/**
 * Cache-aside lookup for location config.
 * Cache hit → return from Redis. Cache miss → query Postgres → populate Redis.
 * Falls back to Postgres if Redis is unavailable.
 */
export const getCachedLocation = async (locationId: string): Promise<CachedLocation | null> => {
  const redis = getRedisClient();

  // Try cache first
  try {
    const cached = await redis.get(`${CACHE_PREFIX}${locationId}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Redis unavailable, fall through to Postgres
  }

  // Cache miss — query Postgres
  const location = await prisma.location.findFirst({
    where: { id: locationId, deletedAt: null },
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

  if (!location) return null;

  // Populate cache
  try {
    await redis.setex(
      `${CACHE_PREFIX}${locationId}`,
      CACHE_TTL_SECONDS,
      JSON.stringify(location)
    );
  } catch {
    // Redis write failed — non-critical, continue without caching
  }

  return location;
};

/**
 * Invalidate a single location's cache entry (call after create/update/delete).
 */
export const invalidateLocationCache = async (locationId: string): Promise<void> => {
  try {
    const redis = getRedisClient();
    await redis.del(`${CACHE_PREFIX}${locationId}`);
  } catch {
    // Non-critical
  }
};
