import type { RequestHandler } from 'express';
import { verifyToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';

/** Extracts a bearer token from the `Authorization` header. */
const extractBearerToken = (header?: string): string | null => {
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
};

/**
 * Hard authentication — rejects the request unless a valid JWT is presented.
 * Populates `req.user` with the decoded identity.
 */
export const authenticate: RequestHandler = (req, _res, next) => {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    return next(AppError.unauthorized('Authentication token is missing'));
  }
  try {
    const claims = verifyToken(token);
    req.user = { id: claims.sub, role: claims.role };
    next();
  } catch {
    next(AppError.unauthorized('Invalid or expired authentication token'));
  }
};

/**
 * Soft authentication — attaches `req.user` when a valid token is present but
 * never blocks the request. Used by public routes that behave differently for
 * logged-in users (e.g. attributing a read to a reader vs. a guest).
 */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const token = extractBearerToken(req.headers.authorization);
  if (token) {
    try {
      const claims = verifyToken(token);
      req.user = { id: claims.sub, role: claims.role };
    } catch {
      // Ignore invalid tokens — the request continues as a guest.
    }
  }
  next();
};
