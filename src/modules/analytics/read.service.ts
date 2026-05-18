import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

export interface ReadContext {
  articleId: string;
  /** The reader's id when authenticated. */
  readerId?: string;
  /** Stable identifier for anonymous readers (typically the client IP). */
  guestKey?: string;
}

/**
 * Records a single article read as a raw ReadLog event (User Story 5).
 *
 * Design notes:
 *  - Invoked fire-and-forget AFTER the response is sent, so it never slows the
 *    article detail endpoint (Technical Constraint #2 — concurrency).
 *  - De-duplicated via Redis: a given reader/guest produces at most ONE
 *    ReadLog per article within READ_DEDUP_TTL_SECONDS. This is the answer to
 *    the bonus question — refreshing the page 100 times in 10 seconds yields a
 *    single log entry. `SET key value NX EX ttl` is atomic and O(1).
 *  - Fails open: if Redis is unavailable the read is still recorded; analytics
 *    accuracy is never allowed to break the reading experience.
 */
export const recordRead = async (ctx: ReadContext): Promise<void> => {
  try {
    const identity = ctx.readerId ? `u:${ctx.readerId}` : `g:${ctx.guestKey ?? 'unknown'}`;
    const dedupKey = `readdedup:${ctx.articleId}:${identity}`;

    let isDuplicate = false;
    try {
      // Returns 'OK' on the first write within the window, null afterwards.
      const result = await redis.set(dedupKey, '1', 'EX', env.READ_DEDUP_TTL_SECONDS, 'NX');
      isDuplicate = result === null;
    } catch (redisErr) {
      logger.warn({ redisErr }, 'Read de-duplication unavailable — recording without dedup');
    }

    if (isDuplicate) return;

    await prisma.readLog.create({
      data: { articleId: ctx.articleId, readerId: ctx.readerId ?? null },
    });
  } catch (err) {
    logger.error({ err, articleId: ctx.articleId }, 'Failed to record read event');
  }
};
