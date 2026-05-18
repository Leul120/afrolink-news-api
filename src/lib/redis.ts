import IORedis, { type RedisOptions } from 'ioredis';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * `maxRetriesPerRequest: null` is required for connections used by BullMQ.
 * `lazyConnect` keeps imports cheap — the socket opens on first use.
 */
const baseOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  lazyConnect: true,
};

/** Creates a fresh connection — BullMQ Workers/Queues each need their own. */
export const createRedisConnection = (): IORedis => {
  const connection = new IORedis(env.REDIS_URL, baseOptions);
  connection.on('error', (err) => logger.error({ err }, 'Redis connection error'));
  return connection;
};

/** Shared connection for lightweight commands (read de-duplication). */
export const redis = createRedisConnection();
