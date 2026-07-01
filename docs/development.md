# Local Development

## Prerequisites

- Node.js ≥ 20.11
- pnpm 10 (`corepack enable && corepack prepare pnpm@10 --activate`)
- Docker Desktop (for Postgres + Redis)
- Optional: `psql` CLI, `redis-cli` for debugging

## First run

```bash
pnpm install
cp .env.example .env

# Bring up local infra
docker compose -f docker/local/docker-compose.yml up -d

# Apply migrations
pnpm db:migrate

# Seed admin user (prints email/password to terminal)
pnpm db:seed

# Start dev
pnpm dev
```

`apps/web` will be on http://localhost:3000.

## Per-package work

Most packages expose `dev`, `build`, `typecheck`, `lint`, `test` via Turbo:

```bash
# Work only on a single package
pnpm --filter @openbulls/db dev
pnpm --filter @openbulls/auth build
pnpm --filter @openbulls/web dev
```

## Database workflows

```bash
# Edit schema in packages/db/src/schema/*
pnpm db:generate     # produce SQL migration in packages/db/src/migrations/
pnpm db:migrate      # apply
pnpm db:studio       # open Drizzle Studio GUI

# Nuke and reseed
pnpm db:reset
pnpm db:migrate
pnpm db:seed
```

## Environment

`.env` at the repo root is read by **scripts** (via `tsx`).

For **apps**, copy relevant blocks to:

- `apps/web/.env.local`
- `apps/agent-worker/.env`
- `apps/cron/.env`
- `apps/telegram-bot/.env`

`packages/config` validates all env vars with zod; missing or malformed values
crash the process at boot with a readable error.

## Logs

`packages/logger` exports a single pino instance. In dev it pretty-prints; in
production it emits structured JSON.

## Code style

- Biome handles formatting and linting (no Prettier / ESLint).
- TypeScript is strict, with `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, and `verbatimModuleSyntax`.
- Use `pnpm lint:fix` to auto-fix; `pnpm lint` to check.

## Testing

Vitest is the test runner. Tests live next to source as `*.test.ts`.

```bash
pnpm test                 # all
pnpm --filter @openbulls/shared test
```