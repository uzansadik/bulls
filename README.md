# Openbulls

AI-powered finance, portfolio tracking, market-data, automation, and reporting
platform. TypeScript monorepo with **LangGraph** at the agent-runtime core.

> **Status:** Sprint 0–2 in progress — workspace, core packages, and
> `apps/web` shell with auth.

## Stack

- **Runtime:** Node.js ≥ 20
- **Package manager:** pnpm 10 (workspaces)
- **Build orchestrator:** Turborepo
- **Language:** TypeScript 5 (strict)
- **Linter / formatter:** Biome
- **Framework:** Next.js 16 (App Router) + React 19
- **DB / ORM:** PostgreSQL + Drizzle
- **Auth:** Better Auth
- **Queue:** BullMQ + Redis (Sprint 3)
- **AI:** Vercel AI SDK + AI Gateway + LangChain + LangGraph (Sprint 3)

## Quick start

```bash
# 1. Install
pnpm install

# 2. Copy env
cp .env.example .env

# 3. (Optional) Local infra
docker compose -f docker/local/docker-compose.yml up -d

# 4. Migrate
pnpm db:migrate

# 5. Seed admin user
pnpm tsx scripts/seed.ts

# 6. Dev
pnpm dev
```

`apps/web` runs on http://localhost:3000.

## Common commands

| Command | Purpose |
| --- | --- |
| `pnpm install` | Install all workspace deps |
| `pnpm dev` | Run all dev servers (Turbo) |
| `pnpm build` | Build all packages and apps |
| `pnpm typecheck` | TypeScript check across the monorepo |
| `pnpm lint` | Biome check |
| `pnpm lint:fix` | Biome autofix |
| `pnpm format` | Biome format |
| `pnpm test` | Run Vitest tests |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:studio` | Drizzle Studio (DB GUI) |
| `pnpm db:seed` | Seed default data |
| `pnpm db:reset` | Drop & recreate the DB |

## Architecture

See [`docs/architecture.md`](./docs/architecture.md) for the high-level
diagram and architectural rules.

The full monorepo target structure is in [`docs/structure.md`](./docs/structure.md).

## Local development

See [`docs/development.md`](./docs/development.md).

## License

UNLICENSED — proprietary.