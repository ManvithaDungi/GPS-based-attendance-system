import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

interface AppError extends Error {
  statusCode?: number;
  error?: string;
}

const isAppError = (value: unknown): value is AppError => {
  return value instanceof Error;
};

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction): Response => {
  const fallbackStatusCode = 500;
  const fallbackError = 'INTERNAL_ERROR';
  const fallbackMessage = 'An unexpected error occurred';

  if (isAppError(err)) {
    const statusCode = Number.isInteger(err.statusCode) ? (err.statusCode as number) : fallbackStatusCode;
    const errorCode = err.error || fallbackError;
    const message = statusCode >= 500 ? fallbackMessage : err.message || fallbackMessage;

    if (statusCode >= 500) {
      logger.error({ err }, 'Unhandled error');
    }

    return res.status(statusCode).json({
      error: errorCode,
      message,
      statusCode,
    });
  }

  logger.error({ err }, 'Unhandled non-error throw');

  return res.status(fallbackStatusCode).json({
    error: fallbackError,
    message: fallbackMessage,
    statusCode: fallbackStatusCode,
  });
};
