import { prismaMock } from './mocks';
import request from 'supertest';
import { mockReset } from 'jest-mock-extended';
import { createApp } from '../src/app';
import { bearer, AUTHOR_ID } from './helpers';
import { aggregateDailyAnalytics, getUtcDayRange } from '../src/modules/analytics/analytics.service';

const app = createApp();
const TRACKED_ARTICLE = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

beforeEach(() => mockReset(prismaMock));

describe('GET /api/author/dashboard', () => {
  it("returns the author's articles with a TotalViews count (200)", async () => {
    (prismaMock.$transaction as jest.Mock).mockResolvedValue([
      [
        {
          id: TRACKED_ARTICLE,
          title: 'Tracked Article',
          category: 'Tech',
          status: 'Published',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
      1,
    ]);
    // Prisma's groupBy is heavily overloaded — cast to a plain jest.Mock.
    (prismaMock.dailyAnalytics.groupBy as jest.Mock).mockResolvedValue([
      { articleId: TRACKED_ARTICLE, _sum: { viewCount: 137 } },
    ]);

    const res = await request(app)
      .get('/api/author/dashboard')
      .set('Authorization', bearer(AUTHOR_ID, 'author'));

    expect(res.status).toBe(200);
    expect(res.body.TotalSize).toBe(1);
    expect(res.body.Object[0].title).toBe('Tracked Article');
    expect(res.body.Object[0].totalViews).toBe(137);
  });

  it('forbids a reader from accessing the dashboard (403)', async () => {
    const res = await request(app)
      .get('/api/author/dashboard')
      .set('Authorization', bearer(AUTHOR_ID, 'reader'));

    expect(res.status).toBe(403);
  });

  it('rejects an unauthenticated request (401)', async () => {
    const res = await request(app).get('/api/author/dashboard');
    expect(res.status).toBe(401);
  });
});

describe('Analytics aggregation engine', () => {
  it('computes day boundaries in GMT/UTC', () => {
    const { start, end } = getUtcDayRange(new Date('2026-05-18T15:30:00.000Z'));
    expect(start.toISOString()).toBe('2026-05-18T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-05-19T00:00:00.000Z');
  });

  it('aggregates ReadLogs and upserts DailyAnalytics idempotently', async () => {
    (prismaMock.readLog.groupBy as jest.Mock).mockResolvedValue([
      { articleId: TRACKED_ARTICLE, _count: { _all: 9 } },
    ]);
    prismaMock.dailyAnalytics.upsert.mockResolvedValue({} as never);

    const result = await aggregateDailyAnalytics(new Date('2026-05-18T12:00:00.000Z'));

    expect(result.articlesProcessed).toBe(1);
    expect(prismaMock.dailyAnalytics.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          articleId_date: { articleId: TRACKED_ARTICLE, date: expect.any(Date) },
        },
        create: expect.objectContaining({ articleId: TRACKED_ARTICLE, viewCount: 9 }),
        update: { viewCount: 9 },
      }),
    );
  });
});
