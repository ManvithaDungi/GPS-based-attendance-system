import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../utils/redis';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

/**
 * Notification delivery worker.
 * Processes notification events and writes to Notification table.
 * FCM/APNs delivery is stubbed — logs intent instead of calling Firebase.
 * Dead-letter queue: failed jobs are retained (removeOnFail: 1000 in queue config).
 */
export const createNotificationWorker = () => {
  const worker = new Worker(
    'notifications',
    async (job: Job) => {
      const { userId, title, body, type } = job.data;

      // Write notification record to database
      await prisma.notification.create({
        data: {
          userId,
          title,
          body,
          type,
        },
      });

      // TODO: Replace with actual FCM/APNs call
      // const user = await prisma.user.findUnique({ where: { id: userId }, select: { fcmToken: true } });
      // if (user?.fcmToken) {
      //   await firebase.messaging().send({ token: user.fcmToken, notification: { title, body } });
      // }

      logger.info({ userId, type, title }, 'Notification sent');
    },
    {
      connection: createRedisConnection(),
      concurrency: 10,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Notification worker job failed');
  });

  return worker;
};
