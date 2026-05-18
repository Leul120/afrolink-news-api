/**
 * Manual analytics trigger — enqueues a one-off aggregation job.
 *
 * Usage:
 *   npm run analytics:run              # aggregates today (UTC)
 *   npm run analytics:run -- 2026-05-18  # aggregates a specific GMT day
 *
 * A running worker (`npm run worker`, or the in-process worker) picks it up.
 */
import { logger } from '../config/logger';
import { analyticsQueue, enqueueAggregation } from '../modules/analytics/analytics.queue';

const run = async (): Promise<void> => {
  const date = process.argv[2] ?? new Date().toISOString().slice(0, 10);
  const job = await enqueueAggregation(date);
  logger.info({ jobId: job.id, date }, 'Enqueued analytics aggregation job');
  await analyticsQueue.close();
  process.exit(0);
};

run().catch((err) => {
  logger.error({ err }, 'Failed to enqueue analytics job');
  process.exit(1);
});
