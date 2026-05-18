/**
 * Database / infrastructure mocks.
 *
 * The unit tests exercise the real HTTP stack (routing, validation,
 * middleware, controllers, services) but with the database and Redis fully
 * mocked — no infrastructure is required to run the suite.
 *
 * Import this module FIRST in every test file so the mocks are registered
 * before the application code is loaded.
 */
import type { PrismaClient } from '@prisma/client';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { prisma } from '../src/lib/prisma';
import * as passwordUtil from '../src/utils/password';

jest.mock('../src/lib/prisma', () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}));

jest.mock('../src/lib/redis', () => ({
  __esModule: true,
  redis: { set: jest.fn().mockResolvedValue('OK') },
  createRedisConnection: jest.fn(),
}));

jest.mock('../src/utils/password', () => ({
  __esModule: true,
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}));

/** Deeply-mocked Prisma client — every model method is a jest mock. */
export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

/** Mocked password helpers (Argon2 is slow and irrelevant to HTTP behaviour). */
export const passwordMock = passwordUtil as jest.Mocked<typeof passwordUtil>;
