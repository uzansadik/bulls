# Openbulls Monorepo Structure

> Snapshot of the target layout. The monorepo is built up sprint-by-sprint;
> not every folder exists yet.

```txt
openbulls/
├─ apps/
│  ├─ web/                         ← Sprint 2
│  ├─ cron/                        ← Sprint 5
│  ├─ agent-worker/                ← Sprint 3
│  └─ telegram-bot/                ← Sprint 5
└─ packages/
   ├─ config/                      ← Sprint 1
   ├─ logger/                      ← Sprint 1
   ├─ shared/                      ← Sprint 1
   ├─ i18n/                        ← Sprint 1
   ├─ db/                          ← Sprint 1
   ├─ auth/                        ← Sprint 1
   ├─ ui/                          ← Sprint 2
   ├─ portfolio/                   ← Sprint 4
   ├─ market-data/                 ← Sprint 1
   ├─ ai/                          ← Sprint 3
   ├─ agent-runtime/               ← Sprint 3
   ├─ automation/                  ← Sprint 5
   ├─ billing/                     ← Sprint 3
   ├─ notifications/               ← Sprint 6
   ├─ integrations/                ← Sprint 5
   ├─ reports/                     ← Sprint 7
   └─ jobs/                        ← Sprint 3
```

See `Structure.md` at the repo root for the full target file tree with all
files inside each package.