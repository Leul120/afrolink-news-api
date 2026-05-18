import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { logger } from './config/logger';
import { isTest } from './config/env';
import { apiRouter } from './routes';
import { notFoundHandler, errorHandler } from './middleware/error';
import { ok } from './utils/ApiResponse';

/**
 * Builds the Express application.
 * Exported as a factory so tests can instantiate a fresh app without starting
 * an HTTP listener or the background worker.
 */
export const createApp = (): Express => {
  const app = express();

  // Trust the first proxy so `req.ip` is accurate (used for guest read dedup).
  app.set('trust proxy', 1);

  // Security & parsing middleware.
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger }));

  // Global abuse protection. Disabled under test to keep tests deterministic.
  if (!isTest) {
    app.use(
      rateLimit({
        windowMs: 60_000,
        limit: 120,
        standardHeaders: true,
        legacyHeaders: false,
      }),
    );
  }

  // Liveness probe.
  app.get('/health', (_req, res) => {
    res.status(200).json(ok('Service is healthy', { uptime: process.uptime() }));
  });

  // Feature routes.
  app.use('/api', apiRouter);

  // 404 + centralised error handling (must be registered last).
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
