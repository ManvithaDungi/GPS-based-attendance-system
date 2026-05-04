import { PrismaClient } from '@prisma/client';
import { getRedisClient } from '../../src/utils/redis';

export const cleanDatabase = async (prisma: PrismaClient) => {
  // Flush Redis (idempotency records, rate limit keys, cache)
  try {
    const redis = getRedisClient();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      redis.flushdb(),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Redis timeout')), 2000);
      }),
    ]);
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  } catch {
    // Redis may not be available in all test environments
  }

  await prisma.$transaction([
    prisma.idempotencyRecord.deleteMany(),
    prisma.attendanceLog.deleteMany(),
    prisma.fraudLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.reportJob.deleteMany(),
    prisma.session.deleteMany(),
    prisma.dailyStats.deleteMany(),
    prisma.workingHours.deleteMany(),
    prisma.location.deleteMany(),
    prisma.user.deleteMany(),
  ]);
};