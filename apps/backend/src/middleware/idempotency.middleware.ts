import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../utils/redis';
import { logger } from '../utils/logger';
import { buildIdempotencyFingerprint } from '../utils/idempotencyFingerprint';

const IDEMPOTENCY_TTL = 86400; // 24 hours in seconds
const KEY_PREFIX = 'idempotency:';
const REQUEST_IN_PROGRESS_ERROR = 'REQUEST_IN_PROGRESS';
const IDEMPOTENCY_MISMATCH_ERROR = 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST';

type ResponseKind = 'json' | 'send';

interface StoredIdempotencyRecord {
  state: 'inflight' | 'completed';
  requestHash: string;
  endpoint: string;
  statusCode?: number;
  responseBody?: unknown;
  responseKind?: ResponseKind;
}

const toRedisValue = (record: StoredIdempotencyRecord): string => JSON.stringify(record);

const fromRedisValue = (value: string | null): StoredIdempotencyRecord | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as StoredIdempotencyRecord;
  } catch {
    return null;
  }
};

const getRoutePath = (req: Request): string => {
  return `${req.baseUrl ?? ''}${req.path}`;
};

const sendStoredResponse = (res: Response, record: StoredIdempotencyRecord): Response => {
  res.status(record.statusCode ?? 200);

  if (record.responseKind === 'send') {
    return res.send(record.responseBody as never);
  }

  return res.json(record.responseBody);
};

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

  const endpoint = getRoutePath(req);
  const requestHash = buildIdempotencyFingerprint(req.method, endpoint, req.query as Record<string, string | string[] | undefined>, req.body);
  const redisKey = `${KEY_PREFIX}${userId}:${idempotencyKey}`;

  try {
    const redis = getRedisClient();
    const existingType = await redis.type(redisKey);

    if (existingType === 'hash') {
      const existing = await redis.hgetall(redisKey);

      if (!existing.requestHash || !existing.endpoint) {
        return res.status(400).json({ error: IDEMPOTENCY_MISMATCH_ERROR });
      }

      if (existing.requestHash !== requestHash || existing.endpoint !== endpoint) {
        return res.status(400).json({ error: IDEMPOTENCY_MISMATCH_ERROR });
      }

      if (existing.responseData) {
        return res.status(200).json(JSON.parse(existing.responseData));
      }

      return res.status(409).json({ error: REQUEST_IN_PROGRESS_ERROR });
    }

    if (existingType === 'string') {
      const existing = fromRedisValue(await redis.get(redisKey));

      if (!existing) {
        return res.status(400).json({ error: IDEMPOTENCY_MISMATCH_ERROR });
      }

      if (existing.requestHash !== requestHash || existing.endpoint !== endpoint) {
        return res.status(400).json({ error: IDEMPOTENCY_MISMATCH_ERROR });
      }

      if (existing.state === 'completed') {
        return sendStoredResponse(res, existing);
      }

      return res.status(409).json({ error: REQUEST_IN_PROGRESS_ERROR });
    }

    const acquired = await redis.set(
      redisKey,
      toRedisValue({
        state: 'inflight',
        requestHash,
        endpoint,
      }),
      'EX',
      IDEMPOTENCY_TTL,
      'NX'
    );

    if (!acquired) {
      const retryExisting = fromRedisValue(await redis.get(redisKey));

      if (!retryExisting) {
        return res.status(409).json({ error: REQUEST_IN_PROGRESS_ERROR });
      }

      if (retryExisting.requestHash !== requestHash || retryExisting.endpoint !== endpoint) {
        return res.status(400).json({ error: IDEMPOTENCY_MISMATCH_ERROR });
      }

      if (retryExisting.state === 'completed') {
        return sendStoredResponse(res, retryExisting);
      }

      return res.status(409).json({ error: REQUEST_IN_PROGRESS_ERROR });
    }

    let capturedStatusCode = res.statusCode;
    let capturedResponseBody: unknown;
    let capturedResponseKind: ResponseKind | undefined;
    let completed = false;

    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    const originalStatus = res.status.bind(res);

    res.status = ((code: number) => {
      capturedStatusCode = code;
      return originalStatus(code);
    }) as typeof res.status;

    res.json = (body?: unknown): Response => {
      capturedResponseKind = 'json';
      capturedResponseBody = body;
      return originalJson(body);
    };

    res.send = ((body?: unknown) => {
      if (!capturedResponseKind) {
        capturedResponseKind = 'send';
        capturedResponseBody = body;
      }
      return originalSend(body as never);
    }) as typeof res.send;

    const finalizeResponse = async () => {
      if (completed || !capturedResponseKind) {
        return;
      }

      completed = true;

      try {
        await redis.set(
          redisKey,
          toRedisValue({
            state: 'completed',
            requestHash,
            endpoint,
            statusCode: capturedStatusCode,
            responseBody: capturedResponseBody,
            responseKind: capturedResponseKind,
          }),
          'EX',
          IDEMPOTENCY_TTL,
          'XX'
        );
      } catch (error) {
        logger.error({ err: error }, 'Failed to finalize idempotency record');
      }
    };

    res.once('finish', () => {
      void finalizeResponse();
    });

    res.once('close', () => {
      if (!completed && !res.writableEnded) {
        redis.del(redisKey).catch((error) => logger.error({ err: error }, 'Failed to clear aborted idempotency record'));
      }
    });

    next();
  } catch (error) {
    next(error);
  }
};
