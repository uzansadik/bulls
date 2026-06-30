---
name: structure
description: Review or update the Openbulls monorepo structure with the current LangGraph-centered architecture.
allowed-tools: Read, Grep, Glob, Edit
---

# Openbulls Structure Skill

Use this skill when reviewing or editing monorepo structure files such as docs/structure.md.

Current app structure:

```txt
apps/
  web/
  cron/
  agent-worker/
  telegram-bot/
```

Current package structure:

```txt
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

Rules:

- apps are thin.
- packages own business logic.
- LangGraph lives in packages/agent-runtime.
- packages/ai owns model/tool/prompt/telemetry utilities.
- market-data is separate from integrations.
- cron is a generic due-job enqueue runner.
- agent-worker executes long-running queued work.
- scheduled jobs are DB records, not hard-coded cron files.
- buildable packages should include package.json, tsconfig.json, tsup.config.ts, and src/index.ts.
