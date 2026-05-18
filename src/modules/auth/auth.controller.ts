import type { Request, Response } from 'express';
import * as authService from './auth.service';
import { ok } from '../../utils/ApiResponse';

export const signupHandler = async (req: Request, res: Response): Promise<void> => {
  const result = await authService.signup(req.body);
  res.status(201).json(ok('Account created successfully', result));
};

export const loginHandler = async (req: Request, res: Response): Promise<void> => {
  const result = await authService.login(req.body);
  res.status(200).json(ok('Login successful', result));
};
