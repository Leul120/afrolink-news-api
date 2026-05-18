import type { RequestHandler } from 'express';
import { type ZodSchema, ZodError } from 'zod';
import { AppError } from '../utils/AppError';

type ValidationTarget = 'body' | 'query' | 'params';

/** Flattens a ZodError into a list of human-readable messages. */
const formatZodError = (error: ZodError): string[] =>
  error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });

/**
 * Centralised request validation middleware.
 *
 * Every incoming body / query / params object is parsed against a Zod schema
 * before reaching a controller. The parsed (and coerced) result replaces the
 * raw input, so controllers always work with clean, typed data.
 */
export const validate =
  (schema: ZodSchema, target: ValidationTarget = 'body'): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      return next(AppError.badRequest('Validation failed', formatZodError(result.error)));
    }
    // Replace raw input with the parsed/coerced value.
    req[target] = result.data;
    next();
  };
