import { Queue } from 'bullmq';
import { createRedisConnection } from '../utils/redis';

let _attendanceEventsQueue: Queue | null = null;
let _notificationsQueue: Queue | null = null;
let _scheduledJobsQueue: Queue | null = null;

/**
 * Lazy-initialized queues. Only connect to Redis when first accessed.
 * Returns null if Redis is not configured (REDIS_URL not set).
 */
export const getAttendanceEventsQueue = (): Queue | null => {
  if (!process.env.REDIS_URL) return null;
  if (!_attendanceEventsQueue) {
    _attendanceEventsQueue = new Queue('attendance-events', {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }
  return _attendanceEventsQueue;
};

export const getNotificationsQueue = (): Queue | null => {
  if (!process.env.REDIS_URL) return null;
  if (!_notificationsQueue) {
    _notificationsQueue = new Queue('notifications', {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 1000,
      },
    });
  }
  return _notificationsQueue;
};

export const getScheduledJobsQueue = (): Queue | null => {
  if (!process.env.REDIS_URL) return null;
  if (!_scheduledJobsQueue) {
    _scheduledJobsQueue = new Queue('scheduled-jobs', {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: 200,
      },
    });
  }
  return _scheduledJobsQueue;
};

/**
 * Close all active queue connections gracefully.
 */
export const closeQueues = async (): Promise<void> => {
  if (_attendanceEventsQueue) await _attendanceEventsQueue.close();
  if (_notificationsQueue) await _notificationsQueue.close();
  if (_scheduledJobsQueue) await _scheduledJobsQueue.close();
};
