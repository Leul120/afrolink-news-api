import type { Request, Response } from 'express';
import { getAuthorDashboard } from './analytics.service';
import { paginated } from '../../utils/ApiResponse';

/** GET /api/author/dashboard — author only (User Story 7). */
export const getDashboardHandler = async (req: Request, res: Response): Promise<void> => {
  const query = req.query as unknown as { page: number; pageSize: number };
  const { items, total, page, pageSize } = await getAuthorDashboard(req.user!.id, query);
  res
    .status(200)
    .json(paginated('Author dashboard retrieved successfully', items, page, pageSize, total));
};
