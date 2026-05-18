import type { Server } from 'http';
import type { Worker } from 'bullmq';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './lib/prisma';
import { scheduleDailyAggregation } from './modules/analytics/analytics.queue';
import { createAnalyticsWorker } from './modules/analytics/analytics.worker';

const start = async (): Promise<void> => {
  const app = createApp();

  const server: Server = app.listen(env.PORT, () => {
    logger.info(`🚀 Afrolink News API listening on http://localhost:${env.PORT}`);
  });

  // For local convenience the analytics worker can run in-process. In
  // production set RUN_WORKER_IN_PROCESS=false and run `npm run worker`
  // as a separate, independently scalable process.
  let worker: Worker | undefined;
  if (env.RUN_WORKER_IN_PROCESS) {
    worker = createAnalyticsWorker();
    await scheduleDailyAggregation();
    logger.info('🛠️  Analytics worker started in-process');
  }

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close();
    await worker?.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
};

start().catch((err) => {
  logger.error({ err }, 'Failed to start the server');
  process.exit(1);
});
