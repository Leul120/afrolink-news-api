import type { RequestHandler } from 'express';
import type { Role } from '@prisma/client';
import { AppError } from '../utils/AppError';

/**
 * Role-Based Access Control middleware.
 * Must run after `authenticate`. Rejects users whose role is not allowed.
 *
 * Usage: `router.post('/articles', authenticate, requireRole('author'), ...)`
 */
export const requireRole =
  (...allowedRoles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden('Forbidden: you do not have permission to access this resource'),
      );
    }
    next();
  };
