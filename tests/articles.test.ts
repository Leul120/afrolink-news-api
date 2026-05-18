import { prismaMock } from './mocks';
import request from 'supertest';
import { mockReset } from 'jest-mock-extended';
import { createApp } from '../src/app';
import {
  buildArticle,
  bearer,
  AUTHOR_ID,
  READER_ID,
  OTHER_AUTHOR_ID,
  ARTICLE_ID,
} from './helpers';

const app = createApp();

const validArticle = {
  title: 'A Production-Ready Article',
  content: 'x'.repeat(80),
  category: 'Tech',
};

beforeEach(() => mockReset(prismaMock));

describe('POST /api/articles', () => {
  it('lets an author create an article (201)', async () => {
    prismaMock.article.create.mockResolvedValue(buildArticle());

    const res = await request(app)
      .post('/api/articles')
      .set('Authorization', bearer(AUTHOR_ID, 'author'))
      .send(validArticle);

    expect(res.status).toBe(201);
    expect(res.body.Success).toBe(true);
    expect(res.body.Object.id).toBe(ARTICLE_ID);
  });

  it('forbids a reader from creating an article (403)', async () => {
    const res = await request(app)
      .post('/api/articles')
      .set('Authorization', bearer(READER_ID, 'reader'))
      .send(validArticle);

    expect(res.status).toBe(403);
    expect(res.body.Message).toMatch(/forbidden/i);
  });

  it('rejects an unauthenticated request (401)', async () => {
    const res = await request(app).post('/api/articles').send(validArticle);
    expect(res.status).toBe(401);
  });

  it('rejects content shorter than 50 characters (400)', async () => {
    const res = await request(app)
      .post('/api/articles')
      .set('Authorization', bearer(AUTHOR_ID, 'author'))
      .send({ ...validArticle, content: 'too short' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/articles (public feed)', () => {
  it('returns a paginated list of published articles', async () => {
    (prismaMock.$transaction as jest.Mock).mockResolvedValue([[buildArticle()], 1]);

    const res = await request(app).get('/api/articles?page=1&pageSize=10');

    expect(res.status).toBe(200);
    expect(res.body.Success).toBe(true);
    expect(res.body.PageNumber).toBe(1);
    expect(res.body.PageSize).toBe(10);
    expect(res.body.TotalSize).toBe(1);
    expect(Array.isArray(res.body.Object)).toBe(true);
  });
});

describe('GET /api/articles/me (author content list)', () => {
  it("returns the author's own articles including drafts (200)", async () => {
    (prismaMock.$transaction as jest.Mock).mockResolvedValue([
      [buildArticle({ status: 'Draft' }), buildArticle()],
      2,
    ]);

    const res = await request(app)
      .get('/api/articles/me')
      .set('Authorization', bearer(AUTHOR_ID, 'author'));

    expect(res.status).toBe(200);
    expect(res.body.TotalSize).toBe(2);
  });

  it('forbids a reader from listing author content (403)', async () => {
    const res = await request(app)
      .get('/api/articles/me')
      .set('Authorization', bearer(READER_ID, 'reader'));

    expect(res.status).toBe(403);
  });
});

describe('GET /api/articles/:id (detail + read tracking)', () => {
  it('returns the article for a guest reader (200)', async () => {
    prismaMock.article.findUnique.mockResolvedValue(buildArticle());
    prismaMock.readLog.create.mockResolvedValue({
      id: 'log',
      articleId: ARTICLE_ID,
      readerId: null,
      readAt: new Date(),
    });

    const res = await request(app).get(`/api/articles/${ARTICLE_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.Object.id).toBe(ARTICLE_ID);
  });

  it('reports "no longer available" for a soft-deleted article (404)', async () => {
    prismaMock.article.findUnique.mockResolvedValue(buildArticle({ deletedAt: new Date() }));

    const res = await request(app).get(`/api/articles/${ARTICLE_ID}`);

    expect(res.status).toBe(404);
    expect(res.body.Success).toBe(false);
    expect(res.body.Message).toMatch(/no longer available/i);
  });
});

describe('PUT /api/articles/:id', () => {
  it("forbids editing another author's article (403)", async () => {
    prismaMock.article.findFirst.mockResolvedValue(buildArticle({ authorId: OTHER_AUTHOR_ID }));

    const res = await request(app)
      .put(`/api/articles/${ARTICLE_ID}`)
      .set('Authorization', bearer(AUTHOR_ID, 'author'))
      .send({ title: 'Hijacked Title' });

    expect(res.status).toBe(403);
    expect(res.body.Success).toBe(false);
    expect(res.body.Message).toMatch(/forbidden/i);
  });

  it("updates the author's own article (200)", async () => {
    prismaMock.article.findFirst.mockResolvedValue(buildArticle({ authorId: AUTHOR_ID }));
    prismaMock.article.update.mockResolvedValue(buildArticle({ title: 'Updated Title' }));

    const res = await request(app)
      .put(`/api/articles/${ARTICLE_ID}`)
      .set('Authorization', bearer(AUTHOR_ID, 'author'))
      .send({ title: 'Updated Title' });

    expect(res.status).toBe(200);
    expect(res.body.Object.title).toBe('Updated Title');
  });
});

describe('DELETE /api/articles/:id (soft delete)', () => {
  it("soft-deletes the author's own article without removing the row (200)", async () => {
    prismaMock.article.findFirst.mockResolvedValue(buildArticle({ authorId: AUTHOR_ID }));
    prismaMock.article.update.mockResolvedValue(buildArticle({ deletedAt: new Date() }));

    const res = await request(app)
      .delete(`/api/articles/${ARTICLE_ID}`)
      .set('Authorization', bearer(AUTHOR_ID, 'author'));

    expect(res.status).toBe(200);
    expect(res.body.Success).toBe(true);
    // Soft delete stamps `deletedAt` via update — a hard delete must never run.
    expect(prismaMock.article.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { deletedAt: expect.any(Date) } }),
    );
    expect(prismaMock.article.delete).not.toHaveBeenCalled();
  });
});
