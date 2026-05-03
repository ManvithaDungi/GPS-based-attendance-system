import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../utils/redis';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyGenerator: (req: Request) => string;
  message?: string;
}

/**
 * Redis-backed token-bucket rate limiter.
 * Fails open (allows request) if Redis is unavailable.
 */
export const createRateLimiter = (options: RateLimitOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    // Skip rate limiting in test environment
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const redis = getRedisClient();
    const key = `ratelimit:${options.keyGenerator(req)}`;

    try {
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.pexpire(key, options.windowMs);
      }

      if (current > options.max) {
        const retryAfterMs = await redis.pttl(key);
        return res.status(429).json({
          error: 'TOO_MANY_REQUESTS',
          message: options.message || 'Too many requests, please try again later.',
          retryAfterMs,
        });
      }

      next();
    } catch {
      // Redis unavailable — fail open (allow request through)
      next();
    }
  };
};

/**
 * Token-bucket: 3 requests per minute per student on attendance endpoints.
 */
export const attendanceRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 3,
  keyGenerator: (req) => `student:${req.user?.id}:attendance`,
  message: 'Too many attendance requests. Max 3 per minute.',
});

/**
 * Per-IP throttle: 100 requests per 15 minutes on auth endpoints.
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 100,
  keyGenerator: (req) => `ip:${req.ip}:auth`,
  message: 'Too many requests from this IP, please try again later.',
});
