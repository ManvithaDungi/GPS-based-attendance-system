/**
 * Logger utility for structured logging
 * TODO: Integrate with a proper logging library (Winston, Pino, etc.) in production
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const log = (level: LogLevel, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...(data && { data }),
  };
  console.log(JSON.stringify(logEntry));
};

export const logger = {
  info: (message: string, data?: any) => log('info', message, data),
  warn: (message: string, data?: any) => log('warn', message, data),
  error: (message: string, data?: any) => log('error', message, data),
  debug: (message: string, data?: any) => log('debug', message, data),
};
