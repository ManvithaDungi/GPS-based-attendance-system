import { PrismaClient } from '@prisma/client';
import { getRedisClient } from '../../src/utils/redis';

export const cleanDatabase = async (prisma: PrismaClient) => {
  // Flush Redis (idempotency records, rate limit keys, cache)
  try {
    const redis = getRedisClient();
    await redis.flushdb();
  } catch {
    // Redis may not be available in all test environments
  }

  await prisma.idempotencyRecord.deleteMany();
  await prisma.attendanceLog.deleteMany();
  await prisma.fraudLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.reportJob.deleteMany();
  await prisma.session.deleteMany();
  await prisma.dailyStats.deleteMany();
  await prisma.workingHours.deleteMany();
  await prisma.location.deleteMany();
  await prisma.user.deleteMany();
};
