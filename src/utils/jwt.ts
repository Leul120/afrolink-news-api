import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env';

export interface AuthTokenClaims {
  /** Subject — the user's id. */
  sub: string;
  role: Role;
}

/** Issues a signed JWT containing the `sub` (userId) and `role` claims. */
export const signToken = (userId: string, role: Role): string => {
  const options = { subject: userId, expiresIn: env.JWT_EXPIRES_IN } as SignOptions;
  return jwt.sign({ role }, env.JWT_SECRET, options);
};

/** Verifies a JWT and returns its claims, or throws if invalid/expired. */
export const verifyToken = (token: string): AuthTokenClaims => {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === 'string' || !decoded.sub || !decoded.role) {
    throw new Error('Malformed token payload');
  }
  return { sub: decoded.sub, role: decoded.role as Role };
};
