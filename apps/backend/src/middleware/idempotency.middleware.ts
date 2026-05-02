import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';

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

  try {
    const existingRecord = await prisma.idempotencyRecord.findUnique({
      where: {
        key_userId: {
          key: idempotencyKey,
          userId,
        },
      },
    });

    if (existingRecord) {
      if (existingRecord.requestHash !== requestHash) {
        return res.status(400).json({ error: 'Idempotency key reused with different payload' });
      }

      if (existingRecord.responseData) {
        return res.status(200).json(existingRecord.responseData);
      }
      
      // If it exists but has no response, it means it's currently processing
      return res.status(409).json({ error: 'Request is already being processed' });
    }

    await prisma.idempotencyRecord.create({
      data: {
        key: idempotencyKey,
        userId,
        endpoint,
        requestHash,
      },
    });

    // Intercept response to save responseData
    const originalJson = res.json.bind(res);
    res.json = (body?: unknown): Response => {
      // Execute asynchronously so we don't block the response
      if (res.statusCode >= 200 && res.statusCode < 300) {
         prisma.idempotencyRecord.update({
           where: {
             key_userId: { key: idempotencyKey, userId },
           },
           data: { responseData: body as Prisma.InputJsonValue },
         }).catch((err) => console.error('Failed to update idempotency record', err));
      } else {
         // Optionally delete the record if it failed so it can be retried
         prisma.idempotencyRecord.delete({
           where: {
             key_userId: { key: idempotencyKey, userId },
           }
         }).catch(() => {});
      }
      return originalJson(body);
    };

    next();
  } catch (error) {
    next(error);
  }
};
