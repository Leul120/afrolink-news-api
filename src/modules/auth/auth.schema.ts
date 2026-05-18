import { z } from 'zod';

/** Name: letters and spaces only — no digits or special characters. */
const NAME_REGEX = /^[A-Za-z ]+$/;

/** Strong password: >=8 chars, with upper, lower, number and special char. */
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .regex(NAME_REGEX, 'Name may only contain letters and spaces'),
  email: z.string().trim().toLowerCase().email('A valid email address is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(
      STRONG_PASSWORD_REGEX,
      'Password must contain an uppercase letter, a lowercase letter, a number and a special character',
    ),
  role: z.enum(['author', 'reader'], {
    message: "Role is required and must be either 'author' or 'reader'",
  }),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email address is required'),
  password: z.string().min(1, 'Password is required'),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
