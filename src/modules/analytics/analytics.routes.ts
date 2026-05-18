import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { paginationSchema } from '../../utils/pagination';
import { getDashboardHandler } from './analytics.controller';

export const authorRouter = Router();

// User Story 7 — Author Performance Dashboard.
authorRouter.get(
  '/dashboard',
  authenticate,
  requireRole('author'),
  validate(paginationSchema, 'query'),
  asyncHandler(getDashboardHandler),
);
