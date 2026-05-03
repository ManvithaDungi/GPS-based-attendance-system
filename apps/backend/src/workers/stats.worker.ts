import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../utils/redis';
import { prisma } from '../utils/prisma';

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
      const date = new Date(timestamp);
      date.setHours(0, 0, 0, 0);

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

      console.log(`[Stats] Updated stats for ${date.toISOString().slice(0, 10)} at ${locationId}: P=${presentCount} A=${absentCount} L=${lateCount}`);
    },
    {
      connection: createRedisConnection(),
      concurrency: 3,
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[Stats Worker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
};
