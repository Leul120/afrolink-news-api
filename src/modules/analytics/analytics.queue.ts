import { Queue, type JobsOptions } from 'bullmq';
import { createRedisConnection } from '../../lib/redis';
import { env } from '../../config/env';

export const ANALYTICS_QUEUE_NAME = 'analytics';
export const AGGREGATE_JOB_NAME = 'aggregate-daily';

export interface AggregateJobData {
  /** ISO date (YYYY-MM-DD). When omitted the worker aggregates "yesterday". */
  date?: string;
}

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: 100,
  removeOnFail: 500,
};

/** The analytics job queue — read events are aggregated through here. */
export const analyticsQueue = new Queue<AggregateJobData>(ANALYTICS_QUEUE_NAME, {
  connection: createRedisConnection(),
  defaultJobOptions,
});

/**
 * Registers the recurring daily aggregation job (User Story 6).
 * BullMQ de-duplicates repeatable jobs by name + cron pattern, so calling this
 * on every boot is safe.
 */
export const scheduleDailyAggregation = async (): Promise<void> => {
  await analyticsQueue.add(
    AGGREGATE_JOB_NAME,
    {},
    { repeat: { pattern: env.ANALYTICS_CRON, tz: 'UTC' } },
  );
};

/** Enqueues a one-off aggregation for a specific date (manual trigger / demo). */
export const enqueueAggregation = (date?: string) =>
  analyticsQueue.add(AGGREGATE_JOB_NAME, date ? { date } : {});
