import type { User } from '@prisma/client';

/**
 * Public-facing user representation.
 * Critically, this NEVER includes the password hash.
 */
export const toUserDTO = (user: User) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

export type UserDTO = ReturnType<typeof toUserDTO>;
