import { Router } from 'express';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  createArticleSchema,
  updateArticleSchema,
  articleIdParamSchema,
  feedQuerySchema,
  myArticlesQuerySchema,
} from './article.schema';
import * as controller from './article.controller';

export const articleRouter = Router();

/* ----------------------------- Public routes ----------------------------- */

// User Story 4 — Public news feed.
articleRouter.get(
  '/',
  validate(feedQuerySchema, 'query'),
  asyncHandler(controller.getFeedHandler),
);

/* --------------------------- Author-only routes --------------------------- */

// User Story 8 — Author's own content list. Declared before "/:id" so the
// literal "me" segment is never captured as an article id.
articleRouter.get(
  '/me',
  authenticate,
  requireRole('author'),
  validate(myArticlesQuerySchema, 'query'),
  asyncHandler(controller.getMyArticlesHandler),
);

// User Story 3 — Create an article.
articleRouter.post(
  '/',
  authenticate,
  requireRole('author'),
  validate(createArticleSchema),
  asyncHandler(controller.createArticleHandler),
);

// User Story 3 — Update an article.
articleRouter.put(
  '/:id',
  authenticate,
  requireRole('author'),
  validate(articleIdParamSchema, 'params'),
  validate(updateArticleSchema),
  asyncHandler(controller.updateArticleHandler),
);

// User Story 3 — Soft-delete an article.
articleRouter.delete(
  '/:id',
  authenticate,
  requireRole('author'),
  validate(articleIdParamSchema, 'params'),
  asyncHandler(controller.deleteArticleHandler),
);

/* ------------------- Public detail route (read tracking) ------------------ */

// User Story 5 — Article detail. `optionalAuth` captures the reader identity
// when present so the read can be attributed (reader vs. guest).
articleRouter.get(
  '/:id',
  optionalAuth,
  validate(articleIdParamSchema, 'params'),
  asyncHandler(controller.getArticleDetailHandler),
);
