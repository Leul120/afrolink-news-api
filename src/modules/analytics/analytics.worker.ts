import { Worker, type Job } from 'bullmq';
import { createRedisConnection } from '../../lib/redis';
import { logger } from '../../config/logger';
import { ANALYTICS_QUEUE_NAME, type AggregateJobData } from './analytics.queue';
import { aggregateDailyAnalytics } from './analytics.service';

/**
 * Resolves which GMT day a job should aggregate.
 * - Explicit `date` (manual run) is used as-is.
 * - Otherwise (the scheduled run) it targets the day that just finished.
 */
const resolveTargetDate = (data: AggregateJobData): Date => {
  if (data.date) {
    return new Date(`${data.date}T00:00:00.000Z`);
  }
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return yesterday;
};

/**
 * Creates and starts the BullMQ worker that processes analytics jobs.
 * Concurrency is 1: aggregation upserts are cheap and serialising them keeps
 * the daily report deterministic.
 */
export const createAnalyticsWorker = (): Worker<AggregateJobData> => {
  const worker = new Worker<AggregateJobData>(
    ANALYTICS_QUEUE_NAME,
    async (job: Job<AggregateJobData>) => {
      const targetDate = resolveTargetDate(job.data);
      return aggregateDailyAnalytics(targetDate);
    },
    { connection: createRedisConnection(), concurrency: 1 },
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Analytics aggregation job completed');
  });
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Analytics aggregation job failed');
  });

  return worker;
};
