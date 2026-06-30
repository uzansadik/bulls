# Openbulls Monorepo Structure

Bu yapı; AI agent/workflow sistemi, kredi yönetimi, kullanıcı bazlı scheduled jobs, cron runner, Telegram bot, portföy yönetimi, billing, tool registry, memory ve resume edilebilir agent run mantığını kapsar.

```txt
openbulls/
├─ apps/
│  ├─ web/
│  │  ├─ app/
│  │  │  ├─ (auth)/
│  │  │  ├─ (dashboard)/
│  │  │  │  ├─ dashboard/
│  │  │  │  │  ├─ page.tsx
│  │  │  │  │  ├─ portfolio/
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ chat/
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ automations/
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ billing/
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  └─ settings/
│  │  │  │  │     └─ page.tsx
│  │  │  ├─ api/
│  │  │  │  ├─ chat/
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ webhooks/
│  │  │  │  │  ├─ telegram/
│  │  │  │  │  │  └─ route.ts
│  │  │  │  │  └─ stripe/
│  │  │  │  │     └─ route.ts
│  │  │  │  └─ cron/
│  │  │  │     └─ trigger/
│  │  │  │        └─ route.ts
│  │  │  ├─ layout.tsx
│  │  │  └─ page.tsx
│  │  ├─ features/
│  │  │  ├─ chat/
│  │  │  │  ├─ components/
│  │  │  │  │  ├─ chat-shell.tsx
│  │  │  │  │  ├─ chat-message.tsx
│  │  │  │  │  ├─ model-selector.tsx
│  │  │  │  │  ├─ tool-call-card.tsx
│  │  │  │  │  ├─ sources-list.tsx
│  │  │  │  │  └─ prompt-input.tsx
│  │  │  │  ├─ actions/
│  │  │  │  │  ├─ list-chat-sessions.action.ts
│  │  │  │  │  ├─ get-chat-session.action.ts
│  │  │  │  │  └─ update-chat-title.action.ts
│  │  │  │  └─ hooks/
│  │  │  │     └─ use-chat-model.ts
│  │  │  ├─ portfolio/
│  │  │  │  ├─ components/
│  │  │  │  │  ├─ portfolio-overview-cards.tsx
│  │  │  │  │  ├─ portfolio-positions-table.tsx
│  │  │  │  │  ├─ add-transaction-dialog.tsx
│  │  │  │  │  └─ currency-select.tsx
│  │  │  │  └─ actions/
│  │  │  │     ├─ get-portfolio-overview.action.ts
│  │  │  │     ├─ add-portfolio-transaction.action.ts
│  │  │  │     └─ refresh-portfolio-prices.action.ts
│  │  │  ├─ automations/
│  │  │  │  ├─ components/
│  │  │  │  │  ├─ automation-list.tsx
│  │  │  │  │  ├─ create-automation-dialog.tsx
│  │  │  │  │  └─ automation-status-badge.tsx
│  │  │  │  └─ actions/
│  │  │  │     ├─ create-user-scheduled-job.action.ts
│  │  │  │     ├─ pause-user-scheduled-job.action.ts
│  │  │  │     ├─ resume-user-scheduled-job.action.ts
│  │  │  │     └─ delete-user-scheduled-job.action.ts
│  │  │  └─ billing/
│  │  │     ├─ components/
│  │  │     │  ├─ credit-balance-card.tsx
│  │  │     │  ├─ usage-table.tsx
│  │  │     │  └─ plan-card.tsx
│  │  │     └─ actions/
│  │  │        ├─ get-credit-balance.action.ts
│  │  │        └─ create-checkout-session.action.ts
│  │  ├─ components/
│  │  ├─ lib/
│  │  ├─ proxy.ts
│  │  └─ next.config.ts
│  │
│  ├─ cron/
│  │  ├─ src/
│  │  │  ├─ index.ts
│  │  │  ├─ runners/
│  │  │  │  └─ run-due-user-scheduled-jobs.ts
│  │  │  ├─ workers/
│  │  │  │  └─ scheduled-jobs.worker.ts
│  │  │  └─ health/
│  │  │     └─ healthcheck.ts
│  │  ├─ package.json
│  │  └─ tsconfig.json
│  │
│  └─ telegram-bot/
│     ├─ src/
│     │  ├─ index.ts
│     │  ├─ webhook.ts
│     │  ├─ handlers/
│     │  │  ├─ message.handler.ts
│     │  │  ├─ command.handler.ts
│     │  │  └─ callback-query.handler.ts
│     │  └─ adapters/
│     │     └─ telegram.adapter.ts
│     ├─ package.json
│     └─ tsconfig.json
│
├─ packages/
│  ├─ db/
│  │  ├─ src/
│  │  │  ├─ index.ts
│  │  │  ├─ client.ts
│  │  │  ├─ schema/
│  │  │  │  ├─ auth.schema.ts
│  │  │  │  ├─ assets.schema.ts
│  │  │  │  ├─ portfolio.schema.ts
│  │  │  │  ├─ chat.schema.ts
│  │  │  │  ├─ ai.schema.ts
│  │  │  │  ├─ billing.schema.ts
│  │  │  │  ├─ automation.schema.ts
│  │  │  │  ├─ notification.schema.ts
│  │  │  │  └─ integrations.schema.ts
│  │  │  ├─ repositories/
│  │  │  │  ├─ ai-chat.repository.ts
│  │  │  │  ├─ portfolio.repository.ts
│  │  │  │  ├─ billing.repository.ts
│  │  │  │  ├─ automation.repository.ts
│  │  │  │  └─ user-memory.repository.ts
│  │  │  └─ migrations/
│  │  ├─ drizzle.config.ts
│  │  └─ package.json
│  │
│  ├─ auth/
│  │  ├─ src/
│  │  │  ├─ index.ts
│  │  │  ├─ server.ts
│  │  │  ├─ client.ts
│  │  │  ├─ better-auth.config.ts
│  │  │  └─ permissions.ts
│  │  └─ package.json
│  │
│  ├─ shared/
│  │  ├─ src/
│  │  │  ├─ index.ts
│  │  │  ├─ value-objects/
│  │  │  │  ├─ id.ts
│  │  │  │  ├─ money.ts
│  │  │  │  ├─ currency.ts
│  │  │  │  ├─ percentage.ts
│  │  │  │  └─ date-range.ts
│  │  │  ├─ types/
│  │  │  │  ├─ result.ts
│  │  │  │  ├─ pagination.ts
│  │  │  │  └─ deep-partial.ts
│  │  │  ├─ errors/
│  │  │  │  ├─ app-error.ts
│  │  │  │  ├─ domain-error.ts
│  │  │  │  └─ validation-error.ts
│  │  │  └─ utils/
│  │  │     ├─ assert.ts
│  │  │     └─ sleep.ts
│  │  └─ package.json
│  │
│  ├─ ui/
│  │  ├─ src/
│  │  │  ├─ components/
│  │  │  │  ├─ button.tsx
│  │  │  │  ├─ card.tsx
│  │  │  │  ├─ dialog.tsx
│  │  │  │  ├─ dropdown-menu.tsx
│  │  │  │  ├─ popover.tsx
│  │  │  │  ├─ table.tsx
│  │  │  │  └─ form.tsx
│  │  │  ├─ ai-elements/
│  │  │  │  ├─ conversation.tsx
│  │  │  │  ├─ message.tsx
│  │  │  │  ├─ prompt-input.tsx
│  │  │  │  ├─ reasoning.tsx
│  │  │  │  ├─ sources.tsx
│  │  │  │  └─ tool.tsx
│  │  │  └─ lib/
│  │  │     └─ cn.ts
│  │  └─ package.json
│  │
│  ├─ portfolio/
│  │  ├─ src/
│  │  │  ├─ index.ts
│  │  │  ├─ domain/
│  │  │  │  ├─ entities/
│  │  │  │  │  ├─ portfolio.entity.ts
│  │  │  │  │  ├─ portfolio-position.entity.ts
│  │  │  │  │  ├─ portfolio-transaction.entity.ts
│  │  │  │  │  └─ asset.entity.ts
│  │  │  │  ├─ value-objects/
│  │  │  │  │  ├─ portfolio-currency.ts
│  │  │  │  │  ├─ transaction-type.ts
│  │  │  │  │  └─ asset-symbol.ts
│  │  │  │  └─ services/
│  │  │  │     ├─ portfolio-calculator.service.ts
│  │  │  │     ├─ average-cost.service.ts
│  │  │  │     └─ portfolio-health.service.ts
│  │  │  ├─ application/
│  │  │  │  ├─ commands/
│  │  │  │  │  ├─ add-transaction.command.ts
│  │  │  │  │  ├─ refresh-prices.command.ts
│  │  │  │  │  └─ calculate-portfolio-health.command.ts
│  │  │  │  ├─ queries/
│  │  │  │  │  ├─ get-portfolio-overview.query.ts
│  │  │  │  │  ├─ get-positions.query.ts
│  │  │  │  │  └─ get-portfolio-history.query.ts
│  │  │  │  └─ ports/
│  │  │  │     ├─ portfolio.repository.port.ts
│  │  │  │     ├─ price-provider.port.ts
│  │  │  │     └─ fx-rate-provider.port.ts
│  │  │  └─ infrastructure/
│  │  │     ├─ repositories/
│  │  │     │  └─ drizzle-portfolio.repository.ts
│  │  │     ├─ price-providers/
│  │  │     │  ├─ composite-price.provider.ts
│  │  │     │  ├─ twelve-data.provider.ts
│  │  │     │  ├─ bist.provider.ts
│  │  │     │  └─ mock-price.provider.ts
│  │  │     └─ fx-providers/
│  │  │        ├─ tcmb.provider.ts
│  │  │        └─ mock-fx.provider.ts
│  │  └─ package.json
│  │
│  ├─ ai/
│  │  ├─ src/
│  │  │  ├─ index.ts
│  │  │  ├─ gateway/
│  │  │  │  ├─ model-registry.ts
│  │  │  │  ├─ provider-registry.ts
│  │  │  │  ├─ gateway-client.ts
│  │  │  │  └─ model-pricing.ts
│  │  │  ├─ orchestrator/
│  │  │  │  ├─ ai-orchestrator.ts
│  │  │  │  ├─ agent-runner.ts
│  │  │  │  ├─ resumable-agent-runner.ts
│  │  │  │  ├─ agent-state-machine.ts
│  │  │  │  └─ agent-context-builder.ts
│  │  │  ├─ agents/
│  │  │  │  ├─ base/
│  │  │  │  │  ├─ bulls-agent.interface.ts
│  │  │  │  │  ├─ agent-input.ts
│  │  │  │  │  ├─ agent-output.ts
│  │  │  │  │  └─ agent-step.ts
│  │  │  │  ├─ portfolio-advisor.agent.ts
│  │  │  │  ├─ financial-statement.agent.ts
│  │  │  │  ├─ report-writer.agent.ts
│  │  │  │  ├─ research.agent.ts
│  │  │  │  ├─ risk-profile.agent.ts
│  │  │  │  └─ router.agent.ts
│  │  │  ├─ workflows/
│  │  │  │  ├─ portfolio-review.workflow.ts
│  │  │  │  ├─ company-analysis.workflow.ts
│  │  │  │  ├─ deep-research.workflow.ts
│  │  │  │  ├─ transaction-capture.workflow.ts
│  │  │  │  └─ report-generation.workflow.ts
│  │  │  ├─ tools/
│  │  │  │  ├─ registry/
│  │  │  │  │  ├─ tool-registry.ts
│  │  │  │  │  ├─ tool-selector.ts
│  │  │  │  │  └─ tool-permissions.ts
│  │  │  │  ├─ portfolio/
│  │  │  │  │  ├─ add-transaction.tool.ts
│  │  │  │  │  ├─ get-portfolio-overview.tool.ts
│  │  │  │  │  ├─ get-positions.tool.ts
│  │  │  │  │  └─ calculate-portfolio-health.tool.ts
│  │  │  │  ├─ market/
│  │  │  │  │  ├─ get-delayed-price.tool.ts
│  │  │  │  │  ├─ get-fx-rate.tool.ts
│  │  │  │  │  └─ search-market-news.tool.ts
│  │  │  │  ├─ financials/
│  │  │  │  │  ├─ get-financial-statement.tool.ts
│  │  │  │  │  ├─ get-income-statement.tool.ts
│  │  │  │  │  ├─ get-balance-sheet.tool.ts
│  │  │  │  │  └─ get-cash-flow.tool.ts
│  │  │  │  └─ automation/
│  │  │  │     ├─ create-scheduled-job.tool.ts
│  │  │  │     ├─ pause-scheduled-job.tool.ts
│  │  │  │     └─ list-scheduled-jobs.tool.ts
│  │  │  ├─ memory/
│  │  │  │  ├─ user-memory.service.ts
│  │  │  │  ├─ conversation-memory.service.ts
│  │  │  │  ├─ investment-preference-memory.ts
│  │  │  │  └─ memory-policy.ts
│  │  │  ├─ prompts/
│  │  │  │  ├─ system/
│  │  │  │  │  ├─ default-system.prompt.ts
│  │  │  │  │  ├─ finance-system.prompt.ts
│  │  │  │  │  └─ safety.prompt.ts
│  │  │  │  ├─ agents/
│  │  │  │  └─ workflows/
│  │  │  └─ telemetry/
│  │  │     ├─ ai-usage-extractor.ts
│  │  │     ├─ ai-event-recorder.ts
│  │  │     └─ source-normalizer.ts
│  │  └─ package.json
│  │
│  ├─ automation/
│  │  ├─ src/
│  │  │  ├─ index.ts
│  │  │  ├─ domain/
│  │  │  │  ├─ entities/
│  │  │  │  │  ├─ user-scheduled-job.entity.ts
│  │  │  │  │  └─ scheduled-job-run.entity.ts
│  │  │  │  ├─ value-objects/
│  │  │  │  │  ├─ scheduled-job-type.ts
│  │  │  │  │  ├─ scheduled-job-status.ts
│  │  │  │  │  ├─ scheduled-job-schedule.ts
│  │  │  │  │  └─ delivery-channel.ts
│  │  │  │  └─ services/
│  │  │  │     ├─ scheduled-job-policy.service.ts
│  │  │  │     ├─ next-run-calculator.service.ts
│  │  │  │     └─ job-deduplication.service.ts
│  │  │  ├─ application/
│  │  │  │  ├─ commands/
│  │  │  │  │  ├─ create-user-scheduled-job.command.ts
│  │  │  │  │  ├─ pause-user-scheduled-job.command.ts
│  │  │  │  │  ├─ resume-user-scheduled-job.command.ts
│  │  │  │  │  ├─ delete-user-scheduled-job.command.ts
│  │  │  │  │  └─ run-due-scheduled-jobs.command.ts
│  │  │  │  ├─ handlers/
│  │  │  │  │  ├─ run-due-scheduled-jobs.handler.ts
│  │  │  │  │  └─ run-single-scheduled-job.handler.ts
│  │  │  │  └─ ports/
│  │  │  │     ├─ scheduled-job.repository.port.ts
│  │  │  │     ├─ scheduled-job-executor.port.ts
│  │  │  │     └─ scheduler-lock.port.ts
│  │  │  └─ infrastructure/
│  │  │     ├─ repositories/
│  │  │     │  └─ drizzle-scheduled-job.repository.ts
│  │  │     ├─ locks/
│  │  │     │  └─ postgres-advisory-lock.ts
│  │  │     └─ executors/
│  │  │        ├─ executor-registry.ts
│  │  │        ├─ portfolio-daily-review.executor.ts
│  │  │        ├─ portfolio-weekly-review.executor.ts
│  │  │        ├─ price-alert.executor.ts
│  │  │        ├─ news-watch.executor.ts
│  │  │        └─ earnings-calendar-watch.executor.ts
│  │  └─ package.json
│  │
│  ├─ billing/
│  │  ├─ src/
│  │  │  ├─ index.ts
│  │  │  ├─ domain/
│  │  │  │  ├─ entities/
│  │  │  │  │  ├─ user-plan.entity.ts
│  │  │  │  │  ├─ credit-wallet.entity.ts
│  │  │  │  │  ├─ credit-transaction.entity.ts
│  │  │  │  │  └─ usage-event.entity.ts
│  │  │  │  ├─ value-objects/
│  │  │  │  │  ├─ plan-type.ts
│  │  │  │  │  ├─ credit-amount.ts
│  │  │  │  │  ├─ usage-type.ts
│  │  │  │  │  └─ billing-currency.ts
│  │  │  │  └─ services/
│  │  │  │     ├─ credit-policy.service.ts
│  │  │  │     ├─ price-markup.service.ts
│  │  │  │     └─ usage-cost-calculator.service.ts
│  │  │  ├─ application/
│  │  │  │  ├─ commands/
│  │  │  │  │  ├─ reserve-credit.command.ts
│  │  │  │  │  ├─ finalize-credit-usage.command.ts
│  │  │  │  │  ├─ refund-credit.command.ts
│  │  │  │  │  ├─ grant-plan-credits.command.ts
│  │  │  │  │  └─ record-ai-usage.command.ts
│  │  │  │  ├─ queries/
│  │  │  │  │  ├─ get-credit-balance.query.ts
│  │  │  │  │  ├─ get-usage-history.query.ts
│  │  │  │  │  └─ get-user-plan.query.ts
│  │  │  │  └─ ports/
│  │  │  │     ├─ billing.repository.port.ts
│  │  │  │     └─ payment-provider.port.ts
│  │  │  └─ infrastructure/
│  │  │     ├─ repositories/
│  │  │     │  └─ drizzle-billing.repository.ts
│  │  │     └─ payment-providers/
│  │  │        ├─ stripe.provider.ts
│  │  │        └─ iyzico.provider.ts
│  │  └─ package.json
│  │
│  ├─ notifications/
│  │  ├─ src/
│  │  │  ├─ index.ts
│  │  │  ├─ domain/
│  │  │  │  ├─ notification-channel.ts
│  │  │  │  ├─ notification-template.ts
│  │  │  │  └─ notification-priority.ts
│  │  │  ├─ application/
│  │  │  │  ├─ send-notification.command.ts
│  │  │  │  └─ notification-router.ts
│  │  │  └─ infrastructure/
│  │  │     ├─ channels/
│  │  │     │  ├─ email.channel.ts
│  │  │     │  ├─ telegram.channel.ts
│  │  │     │  ├─ in-app.channel.ts
│  │  │     │  └─ webhook.channel.ts
│  │  │     └─ templates/
│  │  │        ├─ portfolio-review.template.ts
│  │  │        ├─ price-alert.template.ts
│  │  │        └─ credit-insufficient.template.ts
│  │  └─ package.json
│  │
│  ├─ integrations/
│  │  ├─ src/
│  │  │  ├─ index.ts
│  │  │  ├─ telegram/
│  │  │  │  ├─ telegram-bot-token.service.ts
│  │  │  │  ├─ telegram-webhook.service.ts
│  │  │  │  └─ telegram-message-normalizer.ts
│  │  │  ├─ kap/
│  │  │  │  ├─ kap-client.ts
│  │  │  │  ├─ kap-financial-statement.provider.ts
│  │  │  │  └─ kap-announcement.provider.ts
│  │  │  ├─ market-data/
│  │  │  │  ├─ market-data-client.ts
│  │  │  │  └─ delayed-market-data.provider.ts
│  │  │  └─ encryption/
│  │  │     ├─ secret-vault.ts
│  │  │     └─ encrypt-decrypt.ts
│  │  └─ package.json
│  │
│  ├─ reports/
│  │  ├─ src/
│  │  │  ├─ index.ts
│  │  │  ├─ domain/
│  │  │  │  ├─ report-type.ts
│  │  │  │  └─ report-format.ts
│  │  │  ├─ application/
│  │  │  │  ├─ generate-report.command.ts
│  │  │  │  └─ export-report.command.ts
│  │  │  └─ infrastructure/
│  │  │     ├─ pdf/
│  │  │     │  └─ pdf-report.generator.ts
│  │  │     ├─ excel/
│  │  │     │  └─ excel-report.generator.ts
│  │  │     └─ markdown/
│  │  │        └─ markdown-report.generator.ts
│  │  └─ package.json
│  │
│  ├─ jobs/
│  │  ├─ src/
│  │  │  ├─ index.ts
│  │  │  ├─ queue/
│  │  │  │  ├─ queue-client.ts
│  │  │  │  ├─ queue-names.ts
│  │  │  │  └─ job-payloads.ts
│  │  │  ├─ processors/
│  │  │  │  ├─ ai-agent-run.processor.ts
│  │  │  │  ├─ scheduled-job.processor.ts
│  │  │  │  ├─ notification.processor.ts
│  │  │  │  └─ price-refresh.processor.ts
│  │  │  └─ adapters/
│  │  │     ├─ bullmq.adapter.ts
│  │  │     ├─ redis.adapter.ts
│  │  │     └─ in-memory-queue.adapter.ts
│  │  └─ package.json
│  │
│  ├─ config/
│  │  ├─ src/
│  │  │  ├─ index.ts
│  │  │  ├─ env.ts
│  │  │  ├─ server-env.ts
│  │  │  └─ public-env.ts
│  │  └─ package.json
│  │
│  ├─ logger/
│  │  ├─ src/
│  │  │  ├─ index.ts
│  │  │  ├─ logger.ts
│  │  │  └─ request-context.ts
│  │  └─ package.json
│  │
│  └─ i18n/
│     ├─ src/
│     │  ├─ index.ts
│     │  ├─ config.ts
│     │  ├─ middleware.ts
│     │  └─ messages/
│     │     ├─ tr.json
│     │     └─ en.json
│     └─ package.json
│
├─ tooling/
│  ├─ eslint/
│  ├─ typescript/
│  │  ├─ base.json
│  │  ├─ nextjs.json
│  │  └─ node.json
│  └─ prettier/
│
├─ docker/
│  ├─ local/
│  │  ├─ docker-compose.yml
│  │  ├─ postgres/
│  │  └─ redis/
│  └─ production/
│     ├─ docker-compose.yml
│     ├─ caddy/
│     └─ postgres/
│
├─ scripts/
│  ├─ seed.ts
│  ├─ migrate.ts
│  ├─ reset-db.ts
│  └─ create-admin.ts
│
├─ docs/
│  ├─ architecture.md
│  ├─ billing.md
│  ├─ ai-agents.md
│  ├─ scheduled-jobs.md
│  ├─ telegram-bot.md
│  └─ deployment.md
│
├─ package.json
├─ pnpm-workspace.yaml
├─ pnpm-lock.yaml
├─ turbo.json
├─ tsconfig.json
├─ biome.json
├─ .env.example
└─ README.md
```

## Ana Mimari Kararlar

### 1. Cron App Business Logic Bilmemeli

`apps/cron` içinde şuna benzer dosyalar olmamalı:

```txt
daily-portfolio-review.job.ts
```

Çünkü bu yaklaşım cron uygulamasının iş mantığını bilmesine sebep olur.

Doğru ayrım:

```txt
apps/cron = zamanı gelen işleri tetikleyen generic runner
packages/automation = scheduled job domain/application/executor sistemi
packages/ai = agent/workflow/tool çalıştırma
packages/billing = kredi kontrolü
packages/notifications = sonucu kullanıcıya ulaştırma
packages/ui shadcn ve ai-elements primitive componentleri. (değişiklik yapılamaz / cli ile sadece ekleme yapılır. primitivi componentler değiştirilemez.)
```

Yani günlük portföy yorumu artık cron dosyası değil, DB kaydıdır.

Örnek `user_scheduled_jobs` kaydı:

```json
{
  "userId": "uuid",
  "type": "portfolio.daily_review",
  "status": "active",
  "schedule": {
    "frequency": "daily",
    "time": "09:00"
  },
  "timezone": "Europe/Istanbul",
  "config": {
    "portfolioId": "uuid",
    "deliveryChannel": "telegram",
    "language": "tr",
    "style": "simple"
  },
  "nextRunAt": "2026-07-01T06:00:00.000Z"
}
```

### 2. apps/cron Çalışma Mantığı

```txt
apps/cron
  ↓
runDueUserScheduledJobs()
  ↓
packages/automation
  ↓
due jobs bulunur
  ↓
executor-registry uygun executor'ı seçer
  ↓
portfolio-daily-review.executor çalışır
  ↓
billing credit reserve eder
  ↓
ai workflow çalışır
  ↓
usage finalize edilir
  ↓
notifications sonucu gönderir
  ↓
nextRunAt güncellenir
```

### 3. Kredi Sistemi Merkezi Olmalı

Kredi kontrolü sadece chat route içinde olmamalı. Merkezi paket:

```txt
packages/billing
```

Chat akışı:

```txt
user message
  ↓
billing.reserveCredit()
  ↓
ai-orchestrator çalışır
  ↓
usage çıkarılır
  ↓
billing.finalizeCreditUsage()
```

Scheduled job akışı:

```txt
scheduled job başladı
  ↓
billing.reserveCredit()
  ↓
executor çalışır
  ↓
ai workflow çalışır
  ↓
billing.finalizeCreditUsage()
```

Kredi yoksa:

```txt
job failed değil
job skipped_credit_insufficient
kullanıcıya notification gönderilebilir
nextRunAt yeniden hesaplanır
```

### 4. Agent Resume Mantığı

Kullanıcının kredisi 10 aşamalı agent’ın 5. aşamasında biterse, sistem durup sonra devam edebilmelidir.

Bunun yeri:

```txt
packages/ai/src/orchestrator/resumable-agent-runner.ts
packages/ai/src/orchestrator/agent-state-machine.ts
```

DB tarafında gerekli tablolar:

```txt
ai_agent_runs
ai_agent_run_steps
ai_tool_calls
ai_usage_events
```

Örnek akış:

```txt
agent run başladı
  ↓
step 1 completed
step 2 completed
step 3 completed
step 4 completed
step 5 credit_insufficient
  ↓
run status = paused_credit_insufficient
  ↓
kullanıcı kredi yükledi
  ↓
resume run
  ↓
step 6'dan devam
```

### 5. Tool Sayısı Artınca Tool Selector Kullanılmalı

Her mesajda 100 tool modele verilmemeli.

Bunun için:

```txt
packages/ai/src/tools/registry/tool-selector.ts
```

Örnek:

```txt
Kullanıcı: 100 THYAO aldım
  ↓
tool-selector
  ↓
modele sadece ilgili tool'lar verilir:
- add-transaction.tool
- get-portfolio-overview.tool
- get-delayed-price.tool
```

Başka örnek:

```txt
Kullanıcı: TUPRS bilanço yorumla
  ↓
tool-selector
  ↓
modele sadece ilgili tool'lar verilir:
- get-financial-statement.tool
- get-income-statement.tool
- get-balance-sheet.tool
- search-market-news.tool
```

### 6. apps/cron ve packages/jobs Ayrımı

`apps/cron` zamanlayıcıdır.

```txt
apps/cron
```

`packages/jobs` queue altyapısıdır.

```txt
packages/jobs
```

Örnek akış:

```txt
apps/cron zamanı gelen işleri bulur
  ↓
packages/jobs kuyruğa scheduled-job ekler
  ↓
worker bu işi işler
```

Başlangıçta Redis/BullMQ şart değildir. Basit başlanabilir:

```txt
in-memory / direct execution
```

Sonra büyüyünce geçilebilir:

```txt
Redis + BullMQ
```

Bu yüzden structure’da şu adapter’lar var:

```txt
bullmq.adapter.ts
redis.adapter.ts
in-memory-queue.adapter.ts
```

## Minimum Başlangıç Paketi

Hepsini aynı anda yazmaya gerek yok. İlk gerçekçi başlangıç:

```txt
apps/
  web/
  cron/

packages/
  db/
  auth/
  shared/
  ui/
  portfolio/
  ai/
  billing/
  automation/
  notifications/
  config/
```

Sonradan eklenebilir:

```txt
packages/jobs
packages/reports
packages/integrations
apps/telegram-bot
```

## Temel Mantık

Openbulls şunları kapsar:

```txt
Openbulls
├─ Chat tabanlı AI finans asistanı
├─ Portfolio tracker
├─ Kullanıcı bazlı kredi sistemi
├─ Resume edilebilir agent workflow
├─ Kullanıcı tarafından oluşturulan scheduled jobs
├─ Telegram / web / mail bildirimleri
├─ KAP / piyasa verisi / haber tool’ları
└─ PDF / Excel rapor üretimi
```

En kritik ayrım:

```txt
Job Type = sistemin desteklediği iş türü
Job Instance = kullanıcının oluşturduğu zamanlanmış iş
```

Örnek:

```txt
portfolio.daily_review
```

Bu sistemde desteklenen bir executor olabilir.

Ama:

```txt
Sadık kullanıcısı için her sabah 09:00'da portföy yorumu gönder
```

Bu sadece DB’de duran kullanıcıya özel bir `user_scheduled_jobs` kaydı olmalıdır.
