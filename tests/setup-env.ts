/**
 * Runs before any module is imported (jest `setupFiles`).
 * Provides a deterministic environment so `src/config/env.ts` validates
 * successfully without a real `.env` file.
 */
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/afrolink_test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-jwt-secret-value-1234567890';
process.env.JWT_EXPIRES_IN = '24h';
process.env.RUN_WORKER_IN_PROCESS = 'false';
