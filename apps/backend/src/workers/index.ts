import { createFraudWorker } from './fraud.worker';
import { createStatsWorker } from './stats.worker';
import { createNotificationWorker } from './notification.worker';
import { createAutoCloseWorker, registerAutoCloseCron } from './autoclose.worker';

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

  console.log('[Workers] All workers started: fraud, stats, notification, auto-close');

  return { fraudWorker, statsWorker, notificationWorker, autoCloseWorker };
};

// If run as a standalone process: ts-node src/workers/index.ts
if (require.main === module) {
  require('dotenv/config');
  startWorkers().catch((err) => {
    console.error('[Workers] Failed to start:', err);
    process.exit(1);
  });
}
