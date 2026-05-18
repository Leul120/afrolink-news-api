import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes';
import { articleRouter } from '../modules/articles/article.routes';
import { authorRouter } from '../modules/analytics/analytics.routes';

/** Aggregates every feature router under the `/api` prefix. */
export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/articles', articleRouter);
apiRouter.use('/author', authorRouter);
