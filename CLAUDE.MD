# CLAUDE.md

## Project

Openbulls is an AI-powered finance, portfolio tracking, market-data, automation, and reporting platform.

The project is a TypeScript monorepo using Turborepo, pnpm, Next.js, Drizzle ORM, PostgreSQL, Better Auth, Vercel AI SDK / Vercel AI Gateway, LangChain, and LangGraph.

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
- LangGraph-based resumable AI agent workflows
- Parallel agent execution
- User-created scheduled jobs
- Telegram / web / email notifications
- PDF / Excel reporting

## Core Runtime Decision

Openbulls uses **LangGraph** as the central agent workflow runtime.

LangGraph is responsible for:

- long-running agent workflows
- parallel agent execution
- stateful graph execution
- durable execution
- checkpointing
- resumable agent runs
- human-in-the-loop approval
- multi-agent orchestration
- graph node execution
- graph state persistence

LangChain is used for:

- model abstraction
- tool binding
- prompt templates
- retrievers where needed
- integration with LangGraph agents

Vercel AI SDK / Vercel AI Gateway is used for:

- model access
- provider routing
- streaming responses in the web app
- AI Gateway observability
- model pricing and provider fallback

Do not implement a fully custom agent state machine unless LangGraph cannot support the use case.

Prefer this separation:

```txt
packages/ai
  model gateway, prompt, tool definitions, telemetry

packages/agent-runtime
  LangGraph graphs, nodes, state, checkpointing, graph execution

apps/agent-worker
  executes queued LangGraph runs

packages/jobs
  queue abstraction only
```

## Current Architecture

The repository should follow this high-level structure:

```txt
apps/
  web/
  cron/
  agent-worker/
  telegram-bot/

packages/
  db/
  auth/
  shared/
  ui/
  portfolio/
  market-data/
  ai/
  agent-runtime/
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
- process entrypoints

Business logic should live in packages.

### 2. Web app should not run long workflows

`apps/web` should not execute long-running agent workflows directly.

Correct flow:

```txt
apps/web
  -> create chat message / create agent run
  -> enqueue LangGraph run
  -> stream short response when appropriate
  -> apps/agent-worker executes long workflow
```

### 3. Agent worker executes LangGraph runs

`apps/agent-worker` is responsible for queued long-running work:

- LangGraph runs
- resumable workflows
- scheduled job execution
- report generation
- notification dispatch
- market data refresh job processing

Do not move long-running agent execution into `apps/web`.

### 4. Cron must be generic

Do not create hard-coded cron jobs like:

```txt
daily-portfolio-review.job.ts
```

Instead:

- `apps/cron` only finds due jobs and enqueues them.
- User scheduled jobs are stored in DB.
- `packages/automation` decides which executor runs.
- Executors may enqueue LangGraph runs through `packages/jobs`.

Correct flow:

```txt
apps/cron
  -> enqueueDueUserScheduledJobs()
  -> packages/automation
  -> packages/jobs
  -> apps/agent-worker
  -> packages/agent-runtime
```

### 5. Packages own business logic

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

### 6. Market data is its own package

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

### 7. Integrations is only generic external integration glue

`packages/integrations` should contain generic integration utilities such as:

- Telegram token/webhook helpers
- encryption
- webhook signatures
- external secrets

Market data providers should stay in `packages/market-data`.

### 8. AI tools should call package services

AI tools should not directly contain business logic.

Example:

```txt
ai tool -> portfolio application command/query
ai tool -> market-data application query
ai tool -> automation command
```

### 9. Agent runtime owns graph orchestration

Use `packages/agent-runtime` for:

- LangGraph graph definitions
- graph nodes
- graph state
- graph registry
- graph runner
- graph checkpointing
- graph snapshots
- subagents
- human-in-the-loop nodes

Do not place LangGraph graph definitions directly inside `apps/web` or `apps/agent-worker`.

### 10. Parallel agents should be modeled as graph branches

For company analysis, portfolio review, deep research, and report generation, use LangGraph branching / subgraphs instead of ad-hoc `Promise.all` orchestration scattered across services.

Example:

```txt
company-analysis.graph.ts

START
  -> load-company
  -> parallel:
       financial-statement.subagent
       technical-analysis.subagent
       market-news.subagent
       portfolio-impact.subagent
  -> synthesize-company-analysis
  -> report-writer.subagent
  -> END
```

### 11. Billing must be central

Credit checks should not be scattered inside routes.

Use `packages/billing` for:

- reserve credit
- finalize usage
- refund credit
- usage events
- plan credits
- model cost calculation
- markup calculation

Agent workflows should include billing nodes or billing guards:

```txt
reserve-credit.node.ts
finalize-usage.node.ts
pause-credit-insufficient.node.ts
```

### 12. Agent runs must be resumable

Long-running agent workflows should be persisted.

Use concepts like:

```txt
ai_agent_runs
ai_agent_run_steps
ai_tool_calls
ai_usage_events
agent_graph_snapshots
```

If credit ends during step 5, the run should pause and resume later from the next valid graph checkpoint.

### 13. TypeScript rules

Use TypeScript strictly.

Prefer:

- explicit types
- zod validation at boundaries
- domain value objects
- typed repository ports
- no `any` unless unavoidable
- no business logic in React components

### 14. Database rules

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

### 15. UI rules

Use:

- Next.js App Router
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

### 16. Package build rules

Each buildable package should have:

```txt
package.json
tsconfig.json
tsup.config.ts
src/index.ts
```

Use `tsup` for package builds.

### 17. Naming

Use kebab-case for files:

```txt
portfolio-health.service.ts
get-portfolio-overview.query.ts
add-transaction.command.ts
portfolio-review.graph.ts
reserve-credit.node.ts
```

Use PascalCase for classes and types:

```ts
PortfolioHealthService
GetPortfolioOverviewQuery
AddTransactionCommand
PortfolioReviewGraph
ReserveCreditNode
```

Use camelCase for functions and variables.

### 18. Code generation style

When generating code:

- include full file path
- include complete file contents
- avoid pseudo-code unless explicitly asked
- prefer small incremental changes
- do not rewrite unrelated files
- explain only after code when needed

### 19. Common commands

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

### 20. LangChain / LangGraph dependencies

For the agent runtime package, prefer these dependencies:

```json
{
  "dependencies": {
    "@langchain/core": "latest",
    "@langchain/langgraph": "latest",
    "@langchain/openai": "latest",
    "langchain": "latest"
  }
}
```

Add provider-specific LangChain packages only when needed:

```json
{
  "dependencies": {
    "@langchain/anthropic": "latest",
    "@langchain/google-genai": "latest"
  }
}
```

### 21. Current Focus

The current focus is building a strong monorepo architecture for Openbulls before implementing all features.

Prioritize:

1. clean package boundaries
2. LangGraph-centered agent runtime
3. database schema consistency
4. billing and credit safety
5. market-data separation
6. scheduled jobs as user-created DB records
7. agent-worker for long-running workflows
8. AI SDK / Gateway for model access and streaming UX
