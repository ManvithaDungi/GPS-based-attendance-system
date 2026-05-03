import Redis, { RedisOptions } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const baseOptions: RedisOptions = {
  maxRetriesPerRequest: null, // Required for BullMQ compatibility
  enableReadyCheck: false,
};

let client: Redis | null = null;

/**
 * Singleton Redis client for direct operations (cache, rate limiting, idempotency).
 */
export const getRedisClient = (): Redis => {
  if (!client) {
    client = new Redis(REDIS_URL, baseOptions);
    client.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });
  }
  return client;
};

/**
 * Create a new Redis connection (used by BullMQ — each queue/worker needs its own).
 */
export const createRedisConnection = (): Redis => {
  return new Redis(REDIS_URL, baseOptions);
};

/**
 * Gracefully close the singleton Redis client.
 */
export const closeRedis = async (): Promise<void> => {
  if (client) {
    await client.quit();
    client = null;
  }
};
