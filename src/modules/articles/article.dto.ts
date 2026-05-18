import type { Article } from '@prisma/client';

type ArticleAuthor = { id: string; name: string };
type ArticleWithAuthor = Article & { author?: ArticleAuthor | null };

/** Full article representation (includes the content body). */
export const toArticleDTO = (article: Article) => ({
  id: article.id,
  title: article.title,
  content: article.content,
  category: article.category,
  status: article.status,
  authorId: article.authorId,
  createdAt: article.createdAt,
  updatedAt: article.updatedAt,
  deletedAt: article.deletedAt,
});

/** Detailed view — full article plus a lightweight author object. */
export const toArticleDetailDTO = (article: ArticleWithAuthor) => ({
  ...toArticleDTO(article),
  author: article.author ?? undefined,
});

/** Public feed list item — omits the (potentially large) content body. */
export const toFeedItemDTO = (article: ArticleWithAuthor) => ({
  id: article.id,
  title: article.title,
  category: article.category,
  status: article.status,
  authorId: article.authorId,
  author: article.author ?? undefined,
  createdAt: article.createdAt,
});

/** Author's own list item — exposes draft/deleted state. */
export const toMyArticleDTO = (article: Article) => ({
  id: article.id,
  title: article.title,
  category: article.category,
  status: article.status,
  createdAt: article.createdAt,
  updatedAt: article.updatedAt,
  deletedAt: article.deletedAt,
  isDeleted: article.deletedAt !== null,
});
