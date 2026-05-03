import 'dotenv/config';
import app from './app';
import { PrismaClient } from '@prisma/client';
import { closeRedis } from './utils/redis';
import { closeQueues } from './queues/index';
import { startWorkers } from './workers/index';

const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

const server = app.listen(PORT, async () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[Env] NODE_ENV=${process.env.NODE_ENV}`);

  // Start BullMQ workers inline (skip in test environment)
  if (process.env.NODE_ENV !== 'test') {
    try {
      await startWorkers();
    } catch (err) {
      console.error('[Server] Failed to start workers:', err);
    }
  }
});

process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await closeQueues();
    await prisma.$disconnect();
    await closeRedis();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('[Server] SIGINT received, shutting down gracefully');
  await closeQueues();
  await prisma.$disconnect();
  await closeRedis();
  process.exit(0);
});

export default server;
