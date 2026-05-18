import type { Request, Response } from 'express';
import * as articleService from './article.service';
import { recordRead } from '../analytics/read.service';
import {
  toArticleDTO,
  toArticleDetailDTO,
  toFeedItemDTO,
  toMyArticleDTO,
} from './article.dto';
import type { FeedQuery, MyArticlesQuery } from './article.schema';
import { ok, paginated } from '../../utils/ApiResponse';

/** POST /api/articles — author only. */
export const createArticleHandler = async (req: Request, res: Response): Promise<void> => {
  const article = await articleService.createArticle(req.user!.id, req.body);
  res.status(201).json(ok('Article created successfully', toArticleDTO(article)));
};

/** PUT /api/articles/:id — author only, own article. */
export const updateArticleHandler = async (req: Request, res: Response): Promise<void> => {
  const article = await articleService.updateArticle(req.params.id, req.user!.id, req.body);
  res.status(200).json(ok('Article updated successfully', toArticleDTO(article)));
};

/** DELETE /api/articles/:id — author only, own article (soft delete). */
export const deleteArticleHandler = async (req: Request, res: Response): Promise<void> => {
  await articleService.softDeleteArticle(req.params.id, req.user!.id);
  res.status(200).json(ok('Article deleted successfully'));
};

/** GET /api/articles — public, paginated, filterable feed. */
export const getFeedHandler = async (req: Request, res: Response): Promise<void> => {
  const query = req.query as unknown as FeedQuery;
  const { items, total, page, pageSize } = await articleService.getPublicFeed(query);
  res
    .status(200)
    .json(paginated('Articles retrieved successfully', items.map(toFeedItemDTO), page, pageSize, total));
};

/** GET /api/articles/me — author only, own articles (drafts included). */
export const getMyArticlesHandler = async (req: Request, res: Response): Promise<void> => {
  const query = req.query as unknown as MyArticlesQuery;
  const { items, total, page, pageSize } = await articleService.getMyArticles(req.user!.id, query);
  res
    .status(200)
    .json(paginated('Your articles retrieved successfully', items.map(toMyArticleDTO), page, pageSize, total));
};

/** GET /api/articles/:id — public detail view; records a read event. */
export const getArticleDetailHandler = async (req: Request, res: Response): Promise<void> => {
  const article = await articleService.getArticleDetail(req.params.id, req.user?.id);

  // Respond first — the response cycle must not wait on analytics work.
  res.status(200).json(ok('Article retrieved successfully', toArticleDetailDTO(article)));

  // Fire-and-forget read tracking (User Story 5 / Technical Constraint #2).
  // `recordRead` swallows its own errors, so this can never reject.
  void recordRead({
    articleId: article.id,
    readerId: req.user?.id,
    guestKey: req.ip,
  });
};
