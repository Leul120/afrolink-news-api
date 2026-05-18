import { prisma } from '../../lib/prisma';
import { logger } from '../../config/logger';
import { toPagination } from '../../utils/pagination';

export interface UtcDayRange {
  start: Date;
  end: Date;
}

/**
 * Returns the [start, end) instant boundaries of the UTC/GMT calendar day that
 * contains `date`. All analytics aggregation is performed in GMT (User Story 6).
 */
export const getUtcDayRange = (date: Date): UtcDayRange => {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};

export interface AggregationResult {
  date: Date;
  articlesProcessed: number;
}

/**
 * The Analytics Engine (User Story 6).
 *
 * Aggregates every ReadLog for the given GMT day into the DailyAnalytics table:
 * sums the reads per article and upserts one row per (articleId, date).
 *
 * Idempotent — safe to re-run for the same day (the upsert overwrites counts),
 * which means a failed/retried queue job never double-counts.
 */
export const aggregateDailyAnalytics = async (date: Date): Promise<AggregationResult> => {
  const { start, end } = getUtcDayRange(date);

  const grouped = await prisma.readLog.groupBy({
    by: ['articleId'],
    where: { readAt: { gte: start, lt: end } },
    _count: { _all: true },
  });

  for (const row of grouped) {
    await prisma.dailyAnalytics.upsert({
      where: { articleId_date: { articleId: row.articleId, date: start } },
      create: { articleId: row.articleId, date: start, viewCount: row._count._all },
      update: { viewCount: row._count._all },
    });
  }

  const result: AggregationResult = {
    date: start,
    articlesProcessed: grouped.length,
  };
  logger.info(
    { date: start.toISOString().slice(0, 10), articles: result.articlesProcessed },
    'Daily analytics aggregation completed',
  );
  return result;
};

export interface DashboardItem {
  id: string;
  title: string;
  category: string;
  status: string;
  createdAt: Date;
  totalViews: number;
}

/**
 * Author Performance Dashboard (User Story 7).
 *
 * Returns the author's non-deleted articles, each with a TotalViews count
 * summed from DailyAnalytics. View counts are fetched in a single grouped
 * query to avoid the N+1 problem.
 */
export const getAuthorDashboard = async (
  authorId: string,
  query: { page: number; pageSize: number },
): Promise<{ items: DashboardItem[]; total: number; page: number; pageSize: number }> => {
  const { skip, take, page, pageSize } = toPagination(query.page, query.pageSize);
  const where = { authorId, deletedAt: null };

  const [articles, total] = await prisma.$transaction([
    prisma.article.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, category: true, status: true, createdAt: true },
    }),
    prisma.article.count({ where }),
  ]);

  const articleIds = articles.map((a) => a.id);
  const viewSums = articleIds.length
    ? await prisma.dailyAnalytics.groupBy({
        by: ['articleId'],
        where: { articleId: { in: articleIds } },
        _sum: { viewCount: true },
      })
    : [];

  const viewsByArticle = new Map(viewSums.map((v) => [v.articleId, v._sum.viewCount ?? 0]));

  const items: DashboardItem[] = articles.map((a) => ({
    id: a.id,
    title: a.title,
    category: a.category,
    status: a.status,
    createdAt: a.createdAt,
    totalViews: viewsByArticle.get(a.id) ?? 0,
  }));

  return { items, total, page, pageSize };
};
