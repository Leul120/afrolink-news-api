import { z } from 'zod';

/** Reusable pagination query schema — default page 1, size 10, max size 100. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
});

export interface Pagination {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

/** Converts a page/size pair into Prisma-friendly skip/take values. */
export const toPagination = (page: number, pageSize: number): Pagination => ({
  page,
  pageSize,
  skip: (page - 1) * pageSize,
  take: pageSize,
});
