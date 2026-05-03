/**
 * Logger utility for structured logging
 * TODO: Integrate with a proper logging library (Winston, Pino, etc.) in production
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const log = (level: LogLevel, message: string, data?: unknown) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    message,
  };
  const payload = data === undefined ? logEntry : { ...logEntry, data };
  console.log(JSON.stringify(payload));
};

export const logger = {
  info: (message: string, data?: unknown) => log('info', message, data),
  warn: (message: string, data?: unknown) => log('warn', message, data),
  error: (message: string, data?: unknown) => log('error', message, data),
  debug: (message: string, data?: unknown) => log('debug', message, data),
};
