import app from './app';
import { PrismaClient } from '@prisma/client';

const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

const server = app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[Env] NODE_ENV=${process.env.NODE_ENV}`);
});

// TODO: Handle graceful shutdown
// TODO: Close database connections on exit
// TODO: Properly handle signals (SIGTERM, SIGINT)

process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('[Server] SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

export default server;
