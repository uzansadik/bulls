# Openbulls Architecture

## High-level

Openbulls is a TypeScript monorepo. The **central runtime is LangGraph**;
long-running agent workflows are queued and executed by `apps/agent-worker`,
not by `apps/web`.

```txt
┌─────────────────────────────────────────────────────────────────────────┐
│                              apps/web (Next.js 16)                       │
│  - thin: routes, server actions, UI composition                          │
│  - streams short chat responses via Vercel AI SDK                        │
│  - enqueues long workflows → packages/jobs                              │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       packages/jobs (BullMQ + Redis)                     │
│  - queue abstraction (queue-client, payloads, names)                     │
│  - adapters: bullmq, redis, in-memory                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       apps/agent-worker (process)                        │
│  - consumes queues                                                        │
│  - drives packages/agent-runtime                                          │
│  - emits domain events (notifications, billing)                          │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  packages/agent-runtime (LangGraph)                       │
│  - graph definitions, nodes, state, checkpointer, registry, snapshots    │
│  - subagents and HITL nodes                                              │
│  - calls package application services (portfolio, market-data, billing)  │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                  ┌───────────────┼───────────────┐
                  ▼               ▼               ▼
          ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
          │  portfolio  │ │ market-data │ │  billing    │
          └─────────────┘ └─────────────┘ └─────────────┘
                  │
                  ▼
          ┌─────────────────────────────────────────────┐
          │           packages/db (Drizzle)              │
          │  - schema/*   - repositories/*              │
          └─────────────────────────────────────────────┘
```

## Architectural rules

1. **Apps are thin** — business logic lives in packages.
2. **`apps/web` does not execute long workflows** — it enqueues them.
3. **`apps/agent-worker` runs queued work** — LangGraph runs, scheduled jobs,
   report generation, notifications.
4. **`apps/cron` is generic** — finds due `user_scheduled_jobs` and enqueues
   them; never hard-codes a job type.
5. **Packages own business logic** — `domain / application / infrastructure`.
6. **Market data is its own package** — TCMB, KAP, Yahoo, TwelveData, BIST.
7. **`packages/integrations` is glue** — generic external utilities only.
8. **AI tools call package services** — no business logic inside tools.
9. **`packages/agent-runtime` owns graph orchestration** — no graph code in
   apps.
10. **Parallel agents are graph branches** — `Send` / subgraph pattern, not
    `Promise.all` scattered in services.
11. **Billing is central** — `reserve-credit` / `finalize-usage` / `refund`.
12. **Agent runs are resumable** — checkpointed in DB, paused on credit loss.
13. **Strict TypeScript** — zod at boundaries, branded IDs, no `any`.
14. **Drizzle + repository ports** — domain packages depend on ports, not Drizzle.
15. **Next.js App Router + shadcn/ui + ai-elements** — server actions in
    `apps/web/features/`.
16. **Package build via tsup** — `package.json / tsconfig.json / tsup.config.ts`.
17. **Naming**: kebab-case files, PascalCase classes, camelCase functions.
18. **Code style**: include full file paths and complete contents.
19. **Common commands**: see `README.md`.
20. **LangChain deps** in `packages/agent-runtime`.
21. **Current focus**: clean boundaries, LangGraph-centered runtime, billing
    safety, market-data separation.

For deeper dives, see:

- `docs/structure.md` — full target layout
- `docs/development.md` — local setup
- `docs/agent-runtime.md` (Sprint 3) — graph design
- `docs/langgraph.md` (Sprint 3) — LangGraph usage patterns
- `docs/market-data.md` (Sprint 4) — provider adapters