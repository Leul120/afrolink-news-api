import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { signupSchema, loginSchema } from './auth.schema';
import { signupHandler, loginHandler } from './auth.controller';

export const authRouter = Router();

// User Story 1 — Secure Signup
authRouter.post('/signup', validate(signupSchema), asyncHandler(signupHandler));

// User Story 2 — Login
authRouter.post('/login', validate(loginSchema), asyncHandler(loginHandler));
