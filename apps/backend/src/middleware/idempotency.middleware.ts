import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getRedisClient } from '../utils/redis';

const IDEMPOTENCY_TTL = 86400; // 24 hours in seconds
const KEY_PREFIX = 'idempotency:';

export const idempotencyMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
  if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'] as string;
  if (!idempotencyKey) {
    return next();
  }

  const userId = req.user?.id;
  if (!userId) {
    return next(); // If unauthenticated, let it fail at auth middleware or proceed if public
  }

  const endpoint = req.originalUrl;
  const requestBodyStr = JSON.stringify(req.body);
  const requestHash = crypto.createHash('sha256').update(requestBodyStr).digest('hex');
  const redisKey = `${KEY_PREFIX}${userId}:${idempotencyKey}`;

  try {
    const redis = getRedisClient();
    const existing = await redis.hgetall(redisKey);

    if (existing && Object.keys(existing).length > 0) {
      if (existing.requestHash !== requestHash) {
        return res.status(400).json({ error: 'Idempotency key reused with different payload' });
      }

      if (existing.responseData) {
        return res.status(200).json(JSON.parse(existing.responseData));
      }
      
      // If it exists but has no response, it means it's currently processing
      return res.status(409).json({ error: 'Request is already being processed' });
    }

    // Create new in-flight record
    await redis.hset(redisKey, {
      requestHash,
      endpoint,
    });
    await redis.expire(redisKey, IDEMPOTENCY_TTL);

    // Intercept response to save responseData
    const originalJson = res.json.bind(res);
    res.json = (body?: unknown): Response => {
      // Execute asynchronously so we don't block the response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        redis.hset(redisKey, 'responseData', JSON.stringify(body))
          .catch((err) => console.error('Failed to update idempotency record', err));
      } else {
        // Delete the record if it failed so it can be retried
        redis.del(redisKey).catch(() => {});
      }
      return originalJson(body);
    };

    next();
  } catch (error) {
    next(error);
  }
};
