import { ArticleStatus, type Article, type Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import { toPagination } from '../../utils/pagination';
import type { CreateArticleInput, UpdateArticleInput, FeedQuery, MyArticlesQuery } from './article.schema';

/**
 * Soft-delete is enforced by always filtering on `deletedAt: null` for any
 * public-facing read. Centralising the filter here guarantees no public query
 * ever returns a deleted row (Technical Constraint #3).
 */
const ACTIVE_ONLY = { deletedAt: null } as const satisfies Prisma.ArticleWhereInput;

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Creates a new article owned by the given author (User Story 3). */
export const createArticle = (authorId: string, input: CreateArticleInput): Promise<Article> =>
  prisma.article.create({
    data: {
      title: input.title,
      content: input.content,
      category: input.category,
      status: input.status ?? ArticleStatus.Draft,
      authorId,
    },
  });

/**
 * Loads an active article and asserts the requester owns it.
 * Used by update and delete to enforce "authors only touch their own work".
 */
const getOwnedArticle = async (articleId: string, authorId: string): Promise<Article> => {
  const article = await prisma.article.findFirst({
    where: { id: articleId, ...ACTIVE_ONLY },
  });
  if (!article) {
    throw AppError.notFound('Article not found');
  }
  if (article.authorId !== authorId) {
    throw AppError.forbidden('Forbidden: you can only modify your own articles');
  }
  return article;
};

/** Updates an author's own article (User Story 3). */
export const updateArticle = async (
  articleId: string,
  authorId: string,
  input: UpdateArticleInput,
): Promise<Article> => {
  await getOwnedArticle(articleId, authorId);
  return prisma.article.update({ where: { id: articleId }, data: input });
};

/**
 * Soft-deletes an author's own article (User Story 3).
 * The row is preserved — only `deletedAt` is stamped. No hard delete occurs.
 */
export const softDeleteArticle = async (articleId: string, authorId: string): Promise<Article> => {
  await getOwnedArticle(articleId, authorId);
  return prisma.article.update({
    where: { id: articleId },
    data: { deletedAt: new Date() },
  });
};

/**
 * Public news feed (User Story 4): published, non-deleted articles only,
 * with optional category / author / keyword filters, paginated.
 */
export const getPublicFeed = async (
  query: FeedQuery,
): Promise<PaginatedResult<Article & { author: { id: string; name: string } }>> => {
  const { skip, take, page, pageSize } = toPagination(query.page, query.pageSize);

  const where: Prisma.ArticleWhereInput = {
    ...ACTIVE_ONLY,
    status: ArticleStatus.Published,
    ...(query.category && { category: { equals: query.category, mode: 'insensitive' } }),
    ...(query.author && { author: { name: { contains: query.author, mode: 'insensitive' } } }),
    ...(query.q && { title: { contains: query.q, mode: 'insensitive' } }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.article.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true } } },
    }),
    prisma.article.count({ where }),
  ]);

  return { items, total, page, pageSize };
};

/**
 * Article detail (User Story 5).
 * - Deleted articles report "no longer available".
 * - Drafts are visible only to their own author.
 */
export const getArticleDetail = async (
  articleId: string,
  requesterId?: string,
): Promise<Article & { author: { id: string; name: string } }> => {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { author: { select: { id: true, name: true } } },
  });

  if (!article) {
    throw AppError.notFound('News article not found');
  }
  if (article.deletedAt) {
    throw AppError.notFound('News article no longer available');
  }
  if (article.status === ArticleStatus.Draft && article.authorId !== requesterId) {
    throw AppError.notFound('News article not found');
  }
  return article;
};

/**
 * Author's own article list (User Story 8): both Draft and Published.
 * Soft-deleted articles are excluded unless `includeDeleted=true`.
 */
export const getMyArticles = async (
  authorId: string,
  query: MyArticlesQuery,
): Promise<PaginatedResult<Article>> => {
  const { skip, take, page, pageSize } = toPagination(query.page, query.pageSize);

  const where: Prisma.ArticleWhereInput = {
    authorId,
    ...(query.includeDeleted ? {} : ACTIVE_ONLY),
    ...(query.status && { status: query.status }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.article.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.article.count({ where }),
  ]);

  return { items, total, page, pageSize };
};
