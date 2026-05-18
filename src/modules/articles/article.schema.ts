import { z } from 'zod';

const titleField = z
  .string()
  .trim()
  .min(1, 'Title is required')
  .max(150, 'Title must be at most 150 characters');

const contentField = z
  .string()
  .trim()
  .min(50, 'Content must be at least 50 characters long');

const categoryField = z.string().trim().min(1, 'Category is required');

const statusField = z.enum(['Draft', 'Published'], {
  message: "Status must be either 'Draft' or 'Published'",
});

/** POST /articles */
export const createArticleSchema = z.object({
  title: titleField,
  content: contentField,
  category: categoryField,
  status: statusField.optional(),
});

/** PUT /articles/:id — partial, but at least one field is required. */
export const updateArticleSchema = z
  .object({
    title: titleField,
    content: contentField,
    category: categoryField,
    status: statusField,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

/** Path param shared by /articles/:id routes. */
export const articleIdParamSchema = z.object({
  id: z.string().uuid('A valid article id is required'),
});

/** GET /articles — public feed query. */
export const feedQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  category: z.string().trim().min(1).optional(),
  author: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
});

/** GET /articles/me — author's own content query. */
export const myArticlesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  status: statusField.optional(),
  includeDeleted: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export type CreateArticleInput = z.infer<typeof createArticleSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;
export type FeedQuery = z.infer<typeof feedQuerySchema>;
export type MyArticlesQuery = z.infer<typeof myArticlesQuerySchema>;
