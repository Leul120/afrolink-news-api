import argon2 from 'argon2';

/**
 * Password hashing using Argon2id — the current OWASP-recommended algorithm.
 * The salt is generated and embedded by argon2 automatically.
 */
export const hashPassword = (plain: string): Promise<string> =>
  argon2.hash(plain, { type: argon2.argon2id });

/** Constant-time verification of a plaintext password against a stored hash. */
export const verifyPassword = (hash: string, plain: string): Promise<boolean> =>
  argon2.verify(hash, plain);
