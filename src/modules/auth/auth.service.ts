import { prisma } from '../../lib/prisma';
import { hashPassword, verifyPassword } from '../../utils/password';
import { signToken } from '../../utils/jwt';
import { AppError } from '../../utils/AppError';
import { toUserDTO, type UserDTO } from './auth.dto';
import type { SignupInput, LoginInput } from './auth.schema';

export interface AuthResult {
  user: UserDTO;
  token: string;
}

/**
 * Registers a new user (User Story 1).
 * The pre-check gives a friendly 409; the database unique constraint remains
 * the ultimate guard against a race between two concurrent signups.
 */
export const signup = async (input: SignupInput): Promise<AuthResult> => {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw AppError.conflict('An account with this email address already exists');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: passwordHash,
      role: input.role,
    },
  });

  return { user: toUserDTO(user), token: signToken(user.id, user.role) };
};

/**
 * Authenticates an existing user (User Story 2).
 * Returns the same error whether the email is unknown or the password is wrong
 * — this avoids leaking which emails are registered.
 */
export const login = async (input: LoginInput): Promise<AuthResult> => {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !(await verifyPassword(user.password, input.password))) {
    throw AppError.unauthorized('Invalid email or password');
  }

  return { user: toUserDTO(user), token: signToken(user.id, user.role) };
};
