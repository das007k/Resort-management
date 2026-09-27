# StayAxis

Modular-monolith resort & cottage management platform. First implementation target: Cardamom Rock Resort.

See `docs/phase-reports/phase-1.md` for the current delivery report (what's implemented, tests run, known limitations, review checklist).

## Stack

TypeScript, Next.js (App Router) for both UI and API routes, PostgreSQL via Drizzle ORM with version-controlled SQL migrations, JWT session auth, property-scoped RBAC, Vitest for tests.

## Prerequisites

- Node.js >= 20.9
- A local PostgreSQL 16+ server

## Setup

```bash
npm install

# Create the dev + test databases (adjust user/db names to match your .env)
createdb stayaxis_dev
createdb stayaxis_test

cp .env.example .env
# edit .env: set DATABASE_URL, AUTH_SECRET (openssl rand -base64 48)

npm run db:migrate   # applies db/migrations/*.sql to DATABASE_URL
npm run db:seed      # creates Cardamom Rock Resort org/property, roles, permissions,
                      # an Owner user (owner@cardamomrock.example / ChangeMe123!),
                      # and one linked-inventory cottage (Cottage 1 + Bedroom A/B)

npm run dev           # http://localhost:3000
```

For running tests, also create `.env.test` pointing at a separate `stayaxis_test` database (see `.env.example`), then:

```bash
npm run db:migrate    # with DATABASE_URL pointed at the test DB (see package.json note below)
npm test
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest, single run |
| `npm run db:generate` | Generate a new SQL migration from `platform/db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations to `DATABASE_URL` |
| `npm run db:seed` | Seed development data (safe to re-run — upserts) |
| `npm run db:studio` | Drizzle Studio (visual DB browser) |

## Project layout

```
domains/<name>/{entities,rules,services,repositories,api,ui,__tests__}/  — one folder per business domain
platform/                — cross-cutting: db, auth, availability-service, config, observability
providers/                — external-integration adapter interfaces (payments, channel-manager, whatsapp, ...)
app/                       — Next.js routes and API handlers ONLY — no business logic here
db/migrations/             — version-controlled SQL migrations
docs/phase-reports/        — per-phase delivery reports for architecture/QA review
tests/                     — cross-cutting test fixtures/setup
```

Business logic never lives in `app/`. Every domain owns its own entities, business rules, service layer, and repository — see `docs/phase-reports/phase-1.md` §1 for what's implemented so far.
