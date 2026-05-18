import { Worker } from 'bullmq';
import { createRedisConnection } from '../utils/redis';
import { prisma } from '../utils/prisma';
import { todayDateOnly } from '../utils/date';
import { emitNotification } from '../queues/emitter';
import { getScheduledJobsQueue } from '../queues/index';
import { logger } from '../utils/logger';

/**
 * Midnight auto-close worker.
 * Closes all PENDING attendance logs from today, marks as ABSENT.
 * Fires absent-alert notifications for each affected student.
 * Registered as a BullMQ repeatable job (runs at midnight daily).
 */
export const createAutoCloseWorker = () => {
  const worker = new Worker(
    'scheduled-jobs',
    async () => {
      const today = todayDateOnly();

      const pendingLogs = await prisma.attendanceLog.findMany({
        where: {
          date: today,
          status: 'PENDING',
          deletedAt: null,
        },
        select: {
          id: true,
          studentId: true,
        },
      });

      if (pendingLogs.length === 0) {
        logger.info('No pending logs to close');
        return;
      }

      // Batch update all pending logs to ABSENT
      await prisma.attendanceLog.updateMany({
        where: {
          id: { in: pendingLogs.map((l) => l.id) },
        },
        data: {
          status: 'ABSENT',
          isAutoClosed: true,
        },
      });

      logger.info({ closedCount: pendingLogs.length }, 'Closed pending logs as ABSENT');

      // Fire absent notifications for each affected student
      for (const log of pendingLogs) {
        await emitNotification({
          userId: log.studentId,
          title: 'Attendance Auto-Closed',
          body: 'You did not check out today. Your attendance has been marked as Absent.',
          type: 'absent-alert',
        });
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 1,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'AutoClose worker job failed');
  });

  return worker;
};

/**
 * Register the midnight cron job as a BullMQ repeatable job.
 * Call this once at startup.
 */
export const registerAutoCloseCron = async (): Promise<void> => {
  try {
    const queue = getScheduledJobsQueue();
    if (!queue) {
      logger.info('Redis not configured — skipping cron registration');
      return;
    }
    await queue.add(
      'auto-close',
      {},
      {
        repeat: { pattern: '0 0 * * *' }, // Every day at midnight
        jobId: 'auto-close-daily',
      }
    );
    logger.info('Midnight cron job registered');
  } catch (err) {
    logger.error({ err }, 'Failed to register cron');
  }
};
