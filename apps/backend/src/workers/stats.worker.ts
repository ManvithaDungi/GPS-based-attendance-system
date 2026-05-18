import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../utils/redis';
import { prisma } from '../utils/prisma';
import { toDateOnly } from '../utils/date';
import { logger } from '../utils/logger';

/**
 * DailyStats aggregation worker.
 * Triggers on checkout events.
 * Recomputes aggregate counts (present, absent, late) for the day + location.
 */
export const createStatsWorker = () => {
  const worker = new Worker(
    'attendance-events',
    async (job: Job) => {
      // Only process checkout events for stats
      if (job.name !== 'checkout') return;

      const { locationId, timestamp } = job.data;
      const date = toDateOnly(new Date(timestamp));

      const [presentCount, absentCount, lateCount] = await Promise.all([
        prisma.attendanceLog.count({
          where: { locationId, date, status: 'PRESENT', deletedAt: null },
        }),
        prisma.attendanceLog.count({
          where: { locationId, date, status: 'ABSENT', deletedAt: null },
        }),
        prisma.attendanceLog.count({
          where: { locationId, date, punctuality: 'LATE', deletedAt: null },
        }),
      ]);

      await prisma.dailyStats.upsert({
        where: { date_locationId: { date, locationId } },
        create: {
          date,
          locationId,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
        },
        update: {
          present: presentCount,
          absent: absentCount,
          late: lateCount,
        },
      });

      logger.info(
        { date: date.toISOString().slice(0, 10), locationId, presentCount, absentCount, lateCount },
        'Updated attendance stats'
      );
    },
    {
      connection: createRedisConnection(),
      concurrency: 3,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Stats worker job failed');
  });

  return worker;
};
