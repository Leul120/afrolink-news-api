/**
 * Standalone analytics worker entry point.
 * Run with `npm run worker` to process the job queue in a dedicated process
 * (the recommended production topology).
 */
import { logger } from './config/logger';
import { prisma } from './lib/prisma';
import { scheduleDailyAggregation } from './modules/analytics/analytics.queue';
import { createAnalyticsWorker } from './modules/analytics/analytics.worker';

const start = async (): Promise<void> => {
  const worker = createAnalyticsWorker();
  await scheduleDailyAggregation();
  logger.info('🛠️  Afrolink analytics worker started');

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — shutting down worker`);
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
};

start().catch((err) => {
  logger.error({ err }, 'Failed to start the worker');
  process.exit(1);
});
