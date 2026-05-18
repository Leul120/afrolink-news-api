# Afrolink News API

A production-ready RESTful **News API** where **Authors** publish content and **Readers**
consume it, featuring an **Analytics Engine** that records high-frequency engagement
events and aggregates them into daily reports through a background job queue.

Built with **Node.js + TypeScript**, **Express**, **PostgreSQL (Prisma ORM)**,
**Redis + BullMQ**, and **JWT** authentication.

---

## Table of contents

- [Tech stack & rationale](#tech-stack--rationale)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [The Analytics Engine](#the-analytics-engine)
- [Testing](#testing)
- [How the requirements are met](#how-the-requirements-are-met)
- [Bonus: preventing refresh-spam](#bonus-preventing-refresh-spam)

---

## Tech stack & rationale

| Concern            | Choice                       | Why                                                                                          |
| ------------------ | ---------------------------- | -------------------------------------------------------------------------------------------- |
| Language           | **TypeScript**               | Compile-time safety across the whole stack — DB models, request payloads, responses.         |
| Web framework      | **Express**                  | Minimal, battle-tested, and explicit about the middleware pipeline (auth → RBAC → validate).  |
| Database           | **PostgreSQL**               | Relational integrity (foreign keys, unique constraints) fits the connected data model.       |
| ORM                | **Prisma**                   | Type-safe queries generated from a single schema; first-class migrations and transactions.   |
| Auth               | **JWT** (`jsonwebtoken`)     | Stateless tokens carrying `sub` + `role` — ideal for role-based access control.              |
| Password hashing   | **Argon2id** (`argon2`)      | The current OWASP-recommended password hashing algorithm (memory-hard, salted).              |
| Job queue          | **BullMQ** (Redis-backed)    | Durable, retryable jobs with native cron scheduling for the daily aggregation.               |
| Validation         | **Zod**                      | One schema per request — validates *and* infers TypeScript types (single source of truth).   |
| Logging            | **Pino**                     | Low-overhead structured logging, JSON in production.                                         |
| Testing            | **Jest + Supertest**         | Full HTTP-level tests; the database is mocked so the suite needs no infrastructure.          |

---

## Architecture

A layered, feature-modular design — each request flows through clearly separated stages:

```
HTTP request
   │
   ▼
helmet · cors · json · rate-limit · request-logging      (app.ts)
   │
   ▼
authenticate / optionalAuth  →  requireRole  →  validate(Zod)   (middleware)
   │
   ▼
controller   — HTTP concerns only (status codes, response envelope)
   │
   ▼
service      — business logic & authorization rules
   │
   ▼
Prisma (PostgreSQL)            Redis / BullMQ
                                   │
                                   ▼
                          analytics worker  →  DailyAnalytics
```

- **Controllers** never contain business logic — they call services and shape responses.
- **Services** own the rules (ownership checks, soft-delete filtering, aggregation).
- **The database layer** (`src/lib/prisma.ts`) is the single DB gateway, which makes it
  trivially mockable in tests.
- **Read tracking** is decoupled from the request cycle — the article-detail endpoint
  responds first, then records the read fire-and-forget.
- **Analytics aggregation** runs in a **separate worker** off a Redis-backed queue, so it
  scales independently of the API.

---

## Project structure

```
src/
  app.ts                 Express app factory (middleware + routes)
  server.ts              HTTP entry point (+ optional in-process worker)
  worker.ts              Standalone analytics worker entry point
  config/                Validated env config + logger
  lib/                   Prisma & Redis clients (the only DB/cache gateways)
  middleware/            auth, rbac, validation, centralised error handling
  utils/                 response envelopes, AppError, jwt, password, pagination
  modules/
    auth/                signup & login            (User Stories 1–2)
    articles/            article lifecycle & feed  (User Stories 3–5, 8)
    analytics/           read tracking, queue, worker, dashboard (User Stories 6–7)
  jobs/                  manual analytics trigger script
prisma/
  schema.prisma          data model
  seed.ts                demo data
tests/                   Jest suites (database mocked)
```

---

## Getting started

### Prerequisites

- **Node.js >= 20**
- **Docker** (for PostgreSQL + Redis) — or your own Postgres/Redis instances.

### 1. Install dependencies

```bash
npm install
```

### 2. Start infrastructure (PostgreSQL + Redis)

```bash
docker compose up -d
```

This starts PostgreSQL on `:5432` and Redis on `:6379` with credentials matching the
defaults in `.env.example`.

### 3. Configure the environment

```bash
cp .env.example .env        # Windows: copy .env.example .env
```

The defaults already match `docker-compose.yml`. **Set a strong `JWT_SECRET`.**

### 4. Set up the database schema

```bash
npm run prisma:generate     # generate the typed Prisma client
npm run prisma:push         # create the tables from prisma/schema.prisma
npm run db:seed             # (optional) load a demo author, reader & articles
```

### 5. Run the API

```bash
npm run dev                 # development, with hot reload
```

The API is now at **http://localhost:3000**. Health check: `GET /health`.

By default the analytics worker runs **in-process** for convenience. For a
production-like topology set `RUN_WORKER_IN_PROCESS=false` and run it separately:

```bash
npm run worker
```

### Production build

```bash
npm run build && npm start
```

### Available scripts

| Script                  | Description                                              |
| ----------------------- | -------------------------------------------------------- |
| `npm run dev`           | Start the API in watch mode                              |
| `npm run build`         | Compile TypeScript to `dist/`                            |
| `npm start`             | Run the compiled production build                        |
| `npm run worker`        | Run the analytics worker as a standalone process         |
| `npm run analytics:run` | Manually enqueue an aggregation job (`-- YYYY-MM-DD`)    |
| `npm test`              | Run the Jest test suite                                  |
| `npm run typecheck`     | Type-check without emitting                              |
| `npm run lint`          | Lint the codebase                                        |
| `npm run prisma:push`   | Sync the schema to the database                          |
| `npm run db:seed`       | Seed demo data                                           |

> **Schema management:** `prisma db push` is used for fast local setup. For a
> production deployment, use migrations instead: `npx prisma migrate dev`.

---

## Environment variables

| Variable                 | Required | Default          | Description                                              |
| ------------------------ | -------- | ---------------- | -------------------------------------------------------- |
| `NODE_ENV`               | no       | `development`    | `development` \| `test` \| `production`                  |
| `PORT`                   | no       | `3000`           | HTTP port                                                |
| `LOG_LEVEL`              | no       | `info`           | Pino log level                                           |
| `DATABASE_URL`           | **yes**  | —                | PostgreSQL connection string                             |
| `REDIS_URL`              | **yes**  | —                | Redis connection string (queue + read de-duplication)    |
| `JWT_SECRET`             | **yes**  | —                | Secret for signing JWTs (min. 16 chars)                  |
| `JWT_EXPIRES_IN`         | no       | `24h`            | Token lifetime                                           |
| `READ_DEDUP_TTL_SECONDS` | no       | `600`            | Window in which repeat reads are de-duplicated           |
| `ANALYTICS_CRON`         | no       | `5 0 * * *`      | Cron for the daily aggregation job (evaluated in **UTC**)|
| `RUN_WORKER_IN_PROCESS`  | no       | `true`           | Run the analytics worker inside the API process          |

Invalid configuration fails fast at startup with a descriptive error.

---

## API reference

All responses use a standard envelope.

**Base response**

```json
{ "Success": true, "Message": "string", "Object": {}, "Errors": null }
```

**Paginated response**

```json
{ "Success": true, "Message": "string", "Object": [],
  "PageNumber": 1, "PageSize": 10, "TotalSize": 42, "Errors": null }
```

### Endpoints

| Method   | Endpoint                  | Access        | Description                                       |
| -------- | ------------------------- | ------------- | ------------------------------------------------- |
| `POST`   | `/api/auth/signup`        | Public        | Register a user; returns a JWT                    |
| `POST`   | `/api/auth/login`         | Public        | Authenticate; returns a JWT                       |
| `GET`    | `/api/articles`           | Public        | Published feed — filters: `category`, `author`, `q`; paginated |
| `GET`    | `/api/articles/:id`       | Public        | Article detail; records a read event              |
| `POST`   | `/api/articles`           | Author        | Create an article                                 |
| `PUT`    | `/api/articles/:id`       | Author (own)  | Update an article                                 |
| `DELETE` | `/api/articles/:id`       | Author (own)  | **Soft-delete** an article                        |
| `GET`    | `/api/articles/me`        | Author        | List own articles incl. drafts (`?includeDeleted=true`) |
| `GET`    | `/api/author/dashboard`   | Author        | Own articles with `TotalViews`; paginated         |
| `GET`    | `/health`                 | Public        | Liveness probe                                    |

### Quick walkthrough

```bash
# 1. Register an author
curl -X POST http://localhost:3000/api/auth/signup -H 'Content-Type: application/json' \
  -d '{"name":"Ada Author","email":"ada@afrolink.dev","password":"Str0ng@Pass","role":"author"}'

# 2. Create an article (use the token from step 1)
curl -X POST http://localhost:3000/api/articles -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <TOKEN>' \
  -d '{"title":"Hello Afrolink","content":"<at least fifty characters of content here ...>","category":"Tech","status":"Published"}'

# 3. Read it (creates a ReadLog)
curl http://localhost:3000/api/articles/<ARTICLE_ID>

# 4. Aggregate analytics for today, then check the dashboard
npm run analytics:run
curl http://localhost:3000/api/author/dashboard -H 'Authorization: Bearer <TOKEN>'
```

---

## The Analytics Engine

The engine turns raw `ReadLog` events into daily `DailyAnalytics` reports:

1. **Capture** — every successful `GET /api/articles/:id` records a `ReadLog`
   (reader id when authenticated, otherwise a guest read). This happens
   **after the response is sent** so it never slows the request (Concurrency requirement).
2. **Queue** — aggregation runs on a **BullMQ** queue backed by Redis, with retries
   and exponential backoff.
3. **Schedule** — a repeatable job (`ANALYTICS_CRON`, default `00:05` daily) aggregates
   the day that just finished. All day boundaries are computed in **GMT/UTC**.
4. **Aggregate** — reads for each article on a given day are summed and **upserted** into
   `DailyAnalytics` (unique on `articleId + date`). The upsert makes the job **idempotent**
   — a retried or re-run job never double-counts.

Trigger an aggregation manually (useful for demos):

```bash
npm run analytics:run               # aggregates today (UTC)
npm run analytics:run -- 2026-05-18 # aggregates a specific GMT day
```

---

## Testing

```bash
npm test
```

The suite (`tests/`) exercises the **full HTTP stack** — routing, validation, auth,
RBAC, controllers and services — with **the database and Redis mocked**
(`jest-mock-extended`). No PostgreSQL or Redis instance is required to run it.

Coverage includes signup/login (incl. weak password, duplicate email → 409, invalid
role), article CRUD, ownership enforcement (editing another author's article → 403),
soft-delete behaviour, the public feed, read tracking, the author dashboard, and the
GMT aggregation logic.

---

## How the requirements are met

| Requirement                                   | Implementation                                                              |
| ---------------------------------------------- | --------------------------------------------------------------------------- |
| US1 — Secure signup, strong password, RBAC     | `modules/auth`; Zod password/role rules; duplicate email → **409**          |
| US2 — Login with JWT (`sub` + `role`, 24h)     | `modules/auth`; `utils/jwt.ts`                                              |
| US3 — Article lifecycle + **soft delete**      | `modules/articles`; `DELETE` stamps `deletedAt`, never removes the row      |
| US4 — Public feed, filters, pagination         | `getPublicFeed` — `category` / `author` / `q`, default page 1 size 10       |
| US5 — Read tracking, guest vs. reader          | `optionalAuth` + fire-and-forget `recordRead`                               |
| US6 — Analytics engine via job queue, GMT      | BullMQ queue + worker; UTC day boundaries; idempotent upsert                |
| US7 — Author dashboard with `TotalViews`       | `getAuthorDashboard` — single grouped query (no N+1)                        |
| US8 — Author content list incl. drafts         | `GET /articles/me` — drafts included, `?includeDeleted` optional            |
| RBAC middleware                                | `middleware/rbac.ts` — `requireRole('author')`                              |
| Concurrency — non-blocking reads               | Response sent before `recordRead` runs                                      |
| Soft-delete integrity                          | Shared `ACTIVE_ONLY` filter on every public query                           |
| Centralised validation                         | One `validate(schema)` middleware + Zod schemas per module                  |
| Error handling — no stack traces leaked        | `middleware/error.ts` — standard envelope, generic 500                      |

---

## Bonus: preventing refresh-spam

> *How would you prevent the same user from refreshing the page and generating
> 100 ReadLog entries in 10 seconds?*

**Read de-duplication with a Redis TTL key.** Before a `ReadLog` is written,
`recordRead` performs an atomic:

```
SET readdedup:<articleId>:<identity> 1 EX <READ_DEDUP_TTL_SECONDS> NX
```

- `NX` makes the write succeed **only the first time** within the window.
- `identity` is the reader id for logged-in users, or the client IP for guests.
- If the key already exists, the read is treated as a duplicate and skipped.

So refreshing 100 times in 10 seconds produces **exactly one** `ReadLog`. The check is
O(1), atomic, and **fails open** — if Redis is unavailable the read is still recorded
rather than lost. A global `express-rate-limit` provides a second, coarser layer of
abuse protection.

---

## License

MIT — built as a technical assessment for Afrolink Systems.
