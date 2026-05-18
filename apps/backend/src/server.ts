import 'dotenv/config';
import app from './app';
import { PrismaClient } from '@prisma/client';
import { closeRedis } from './utils/redis';
import { closeQueues } from './queues/index';
import { startWorkers } from './workers/index';
import { logger } from './utils/logger';

// Global error handlers to catch silent crashes
process.on('uncaughtException', (err) => {
  logger.error({ err }, 'UNCAUGHT EXCEPTION - exiting process');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'UNHANDLED REJECTION');
});

const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

const server = app.listen(PORT, '0.0.0.0', async () => {
  logger.info({ port: PORT, nodeEnv: process.env.NODE_ENV }, 'Server running');

  // Start BullMQ workers inline (skip in test environment)
  if (process.env.NODE_ENV !== 'test') {
    try {
      await startWorkers();
    } catch (err) {
      logger.error({ err }, 'Failed to start workers');
    }
  }
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await closeQueues();
    await prisma.$disconnect();
    await closeRedis();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await closeQueues();
  await prisma.$disconnect();
  await closeRedis();
  process.exit(0);
});

export default server;
