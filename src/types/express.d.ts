import type { Role } from '@prisma/client';

/**
 * Augments Express' Request with the authenticated user, populated by the
 * authentication middleware after a JWT is verified.
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
      };
    }
  }
}

export {};
