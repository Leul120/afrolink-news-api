import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { fail } from '../utils/ApiResponse';
import { logger } from '../config/logger';

/** Handles requests that match no route. */
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json(fail(`Route not found: ${req.method} ${req.originalUrl}`));
};

/**
 * Central error handler — the single place that turns any thrown error into a
 * standardised response. Stack traces are logged server-side but NEVER leaked
 * to the client.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Known, operational errors raised intentionally by the application.
  if (err instanceof AppError) {
    res.status(err.statusCode).json(fail(err.message, err.errors));
    return;
  }

  // Validation errors that bypassed the validate() middleware.
  if (err instanceof ZodError) {
    const errors = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    res.status(400).json(fail('Validation failed', errors));
    return;
  }

  // Database constraint violations mapped to meaningful HTTP statuses.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json(fail('A record with these details already exists'));
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json(fail('The requested record was not found'));
      return;
    }
  }

  // Anything else is unexpected — log the full detail, return a generic message.
  logger.error({ err }, 'Unhandled error');
  res.status(500).json(fail('An unexpected error occurred. Please try again later.'));
};
