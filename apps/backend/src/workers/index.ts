import { createFraudWorker } from './fraud.worker';
import { createStatsWorker } from './stats.worker';
import { createNotificationWorker } from './notification.worker';
import { createAutoCloseWorker, registerAutoCloseCron } from './autoclose.worker';
import { logger } from '../utils/logger';

/**
 * Start all BullMQ workers.
 * Can run in-process (called from server.ts) or as a separate process.
 */
export const startWorkers = async () => {
  const fraudWorker = createFraudWorker();
  const statsWorker = createStatsWorker();
  const notificationWorker = createNotificationWorker();
  const autoCloseWorker = createAutoCloseWorker();

  // Register the midnight auto-close cron job
  await registerAutoCloseCron();

  logger.info('All workers started: fraud, stats, notification, auto-close');

  return { fraudWorker, statsWorker, notificationWorker, autoCloseWorker };
};

// If run as a standalone process: ts-node src/workers/index.ts
if (require.main === module) {
  require('dotenv/config');
  startWorkers().catch((err) => {
    logger.error({ err }, 'Failed to start workers');
    process.exit(1);
  });
}
