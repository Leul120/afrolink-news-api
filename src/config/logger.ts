import pino from 'pino';
import { env, isProduction, isTest } from './env';

/**
 * Structured application logger.
 * - Production: raw JSON (ready for log aggregators).
 * - Development: pretty-printed for readability.
 * - Test: silenced to keep test output clean.
 */
export const logger = pino({
  level: isTest ? 'silent' : env.LOG_LEVEL,
  ...(isProduction || isTest
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        },
      }),
});
