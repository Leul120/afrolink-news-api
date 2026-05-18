import { prismaMock, passwordMock } from './mocks';
import request from 'supertest';
import { mockReset } from 'jest-mock-extended';
import { createApp } from '../src/app';
import { buildUser } from './helpers';

const app = createApp();

beforeEach(() => {
  mockReset(prismaMock);
  passwordMock.hashPassword.mockResolvedValue('argon2-hashed-password');
  passwordMock.verifyPassword.mockResolvedValue(true);
});

describe('POST /api/auth/signup', () => {
  const validBody = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'Str0ng@Pass',
    role: 'author',
  };

  it('creates an account and returns a JWT (201)', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(buildUser({ email: 'jane@example.com' }));

    const res = await request(app).post('/api/auth/signup').send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.Success).toBe(true);
    expect(res.body.Object.token).toEqual(expect.any(String));
    // The password hash must never be exposed in the response.
    expect(res.body.Object.user.password).toBeUndefined();
  });

  it('rejects a weak password (400)', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...validBody, password: 'weak' });

    expect(res.status).toBe(400);
    expect(res.body.Success).toBe(false);
    expect(res.body.Errors.length).toBeGreaterThan(0);
  });

  it('rejects a name containing digits or special characters (400)', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...validBody, name: 'Jane99' });

    expect(res.status).toBe(400);
  });

  it('rejects a missing or invalid role (400)', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...validBody, role: 'superadmin' });

    expect(res.status).toBe(400);
  });

  it('returns 409 Conflict when the email already exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue(buildUser());

    const res = await request(app).post('/api/auth/signup').send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.Success).toBe(false);
    expect(res.body.Errors[0]).toMatch(/already exists/i);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with valid credentials and returns a JWT (200)', async () => {
    prismaMock.user.findUnique.mockResolvedValue(buildUser());
    passwordMock.verifyPassword.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Str0ng@Pass' });

    expect(res.status).toBe(200);
    expect(res.body.Success).toBe(true);
    expect(res.body.Object.token).toEqual(expect.any(String));
  });

  it('rejects an incorrect password (401)', async () => {
    prismaMock.user.findUnique.mockResolvedValue(buildUser());
    passwordMock.verifyPassword.mockResolvedValue(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.Success).toBe(false);
  });

  it('rejects an unknown email (401)', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@example.com', password: 'Str0ng@Pass' });

    expect(res.status).toBe(401);
  });
});
