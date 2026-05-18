import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

/**
 * Single shared PrismaClient instance.
 *
 * This module is the sole gateway to the database, which makes it trivial to
 * swap with a mock in unit tests (see tests/mocks.ts).
 */
export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
