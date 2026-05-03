import { Queue } from 'bullmq';
import { createRedisConnection } from '../utils/redis';

/**
 * Queue for attendance-related events (check-in, check-out).
 * Consumed by: fraud worker, stats worker, notification worker.
 */
export const attendanceEventsQueue = new Queue('attendance-events', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

/**
 * Queue for notification delivery (FCM/APNs push).
 */
export const notificationsQueue = new Queue('notifications', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 1000,
  },
});

/**
 * Queue for scheduled/cron jobs (midnight auto-close, report generation).
 */
export const scheduledJobsQueue = new Queue('scheduled-jobs', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 50,
    removeOnFail: 200,
  },
});

/**
 * Close all queue connections gracefully.
 */
export const closeQueues = async (): Promise<void> => {
  await attendanceEventsQueue.close();
  await notificationsQueue.close();
  await scheduledJobsQueue.close();
};
