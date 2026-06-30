# CLAUDE.md

## Project

Openbulls is an AI-powered finance, portfolio tracking, market-data, automation, and reporting platform.

The project is a TypeScript monorepo using Turborepo, pnpm, Next.js, Drizzle ORM, PostgreSQL, Better Auth, Vercel AI SDK, and modular domain packages.

## Language

Always respond in Turkish unless the user explicitly asks for English.

Code, file names, identifiers, commits, and technical terms should remain in English.

## Main Goal

Build Openbulls as a scalable monorepo with:

- AI chat assistant
- Portfolio tracker
- Market data package
- Financial statement analysis
- Technical indicators
- User credit / billing system
- Resumable AI agent workflows
- User-created scheduled jobs
- Telegram / web / email notifications
- PDF / Excel reporting

## Current Architecture

The repository should follow this high-level structure: See @Structure.md

```txt
apps/
  web/
  cron/
  telegram-bot/

packages/
  db/
  auth/
  shared/
  ui/
  portfolio/
  market-data/
  ai/
  automation/
  billing/
  notifications/
  integrations/
  reports/
  jobs/
  config/
  logger/
  i18n/
```

## Important Architectural Rules

### 1. Apps should be thin

Apps should mostly contain:

- routing
- API handlers
- UI composition
- app-level wiring
- entrypoints

Business logic should live in packages.

### 2. Packages own business logic

Domain and application logic should live under packages.

Use this package structure where possible:

```txt
package-name/
├─ package.json
├─ tsconfig.json
├─ tsup.config.ts
└─ src/
   ├─ index.ts
   ├─ domain/
   ├─ application/
   └─ infrastructure/
```

### 3. Cron must be generic

Do not create hard-coded cron jobs like:

```txt
daily-portfolio-review.job.ts
```

Instead:

- `apps/cron` only runs due jobs.
- User scheduled jobs are stored in DB.
- `packages/automation` decides which executor runs.
- Executors are selected by job type.

Correct flow:

```txt
apps/cron
  -> runDueUserScheduledJobs()
  -> packages/automation
  -> executor-registry
  -> specific executor
```

### 4. Market data is its own package

Do not hide market data under `integrations`.

The `packages/market-data` package owns:

- prices
- candles
- FX rates
- financial statements
- financial ratios
- technical indicators
- market news
- KAP / SEC / Yahoo / Twelve Data / TCMB provider adapters

### 5. Integrations is only generic external integration glue

`packages/integrations` should contain generic integration utilities such as:

- Telegram token/webhook helpers
- encryption
- webhook signatures
- external secrets

Market data providers should stay in `packages/market-data`.

### 6. AI tools should call package services

AI tools should not directly contain business logic.

Example:

```txt
ai tool -> portfolio application command/query
ai tool -> market-data application query
ai tool -> automation command
```

### 7. Billing must be central

Credit checks should not be scattered inside routes.

Use `packages/billing` for:

- reserve credit
- finalize usage
- refund credit
- usage events
- plan credits
- model cost calculation
- markup calculation

### 8. Agent runs must be resumable

Long-running agent workflows should be persisted.

Use concepts like:

```txt
ai_agent_runs
ai_agent_run_steps
ai_tool_calls
ai_usage_events
```

If credit ends during step 5, the run should pause and resume later from step 6.

### 9. TypeScript rules

Use TypeScript strictly.

Prefer:

- explicit types
- zod validation at boundaries
- domain value objects
- typed repository ports
- no `any` unless unavoidable
- no business logic in React components

### 10. Database rules

Use Drizzle ORM.

Schema files live in:

```txt
packages/db/src/schema/
```

Repositories live in:

```txt
packages/db/src/repositories/
```

Domain packages should depend on repository ports, not directly on Drizzle where possible.

### 11. UI rules

Use:

- Next.js App Router latest
- shadcn/ui
- Tailwind
- ai-elements for chat UI
- server actions where appropriate

Keep frontend logic under:

```txt
apps/web/features/
```

Shared UI components live in:

```txt
packages/ui/
```

### 12. Package build rules

Each buildable package should have:

```txt
package.json
tsconfig.json
tsup.config.ts
src/index.ts
```

Use `tsup` for package builds.

### 13. Naming

Use kebab-case for files:

```txt
portfolio-health.service.ts
get-portfolio-overview.query.ts
add-transaction.command.ts
```

Use PascalCase for classes and types:

```ts
PortfolioHealthService
GetPortfolioOverviewQuery
AddTransactionCommand
```

Use camelCase for functions and variables.

### 14. Code generation style

When generating code:

- include full file path
- include complete file contents
- avoid pseudo-code unless explicitly asked
- prefer small incremental changes
- do not rewrite unrelated files
- explain only after code when needed

### 15. Commands

Common commands:

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

### 16. Current Focus

The current focus is building a strong monorepo architecture for Openbulls before implementing all features.

Prioritize:

1. clean package boundaries
2. database schema consistency
3. billing and credit safety
4. AI orchestration abstraction
5. market-data separation
6. scheduled jobs as user-created DB records