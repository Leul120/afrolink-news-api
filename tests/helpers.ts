import type { Role, User, Article } from '@prisma/client';
import { signToken } from '../src/utils/jwt';

export const AUTHOR_ID = '11111111-1111-1111-1111-111111111111';
export const READER_ID = '22222222-2222-2222-2222-222222222222';
export const OTHER_AUTHOR_ID = '33333333-3333-3333-3333-333333333333';
export const ARTICLE_ID = '44444444-4444-4444-4444-444444444444';

/** Builds an `Authorization` header value with a freshly signed JWT. */
export const bearer = (userId: string, role: Role): string =>
  `Bearer ${signToken(userId, role)}`;

/** Test fixture — a User row. */
export const buildUser = (overrides: Partial<User> = {}): User => ({
  id: AUTHOR_ID,
  name: 'Test User',
  email: 'test@example.com',
  password: 'argon2-hashed-password',
  role: 'author',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

/** Test fixture — an Article row. */
export const buildArticle = (overrides: Partial<Article> = {}): Article => ({
  id: ARTICLE_ID,
  title: 'A Production-Ready Article',
  content: 'x'.repeat(80),
  category: 'Tech',
  status: 'Published',
  authorId: AUTHOR_ID,
  createdAt: new Date('2026-01-02T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  deletedAt: null,
  ...overrides,
});
