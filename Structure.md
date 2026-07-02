# Openbulls Monorepo Structure

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
│  │  │  │  ├─ auth/
│  │  │  │  │  └─ [...all]/
│  │  │  │  │     └─ route.ts
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
│  │  │  ├─ [locale]/
│  │  │  │  ├─ (auth)/
│  │  │  │  │  ├─ layout.tsx
│  │  │  │  │  ├─ sign-in/
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  └─ sign-up/
│  │  │  │  │     └─ page.tsx
│  │  │  │  ├─ (dashboard)/
│  │  │  │  │  ├─ layout.tsx
│  │  │  │  │  ├─ page.tsx
│  │  │  │  │  ├─ chat/
│  │  │  │  │  │  ├─ page.tsx
│  │  │  │  │  │  └─ [sessionId]/
│  │  │  │  │  │     └─ page.tsx
│  │  │  │  ├─ layout.tsx
│  │  │  │  └─ page.tsx
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
│  │  │  │  │  ├─ prompt-input.tsx
│  │  │  │  │  ├─ session-sidebar.tsx
│  │  │  │  │  └─ agent-mode-toggle.tsx
│  │  │  │  ├─ actions/
│  │  │  │  │  ├─ list-chat-sessions.action.ts
│  │  │  │  │  ├─ get-chat-session.action.ts
│  │  │  │  │  ├─ create-chat-session.action.ts
│  │  │  │  │  └─ save-chat-message.action.ts
│  │  │  │  ├─ hooks/
│  │  │  │  │  └─ use-chat-model.ts
│  │  │  │  └─ schemas/
│  │  │  │     └─ chat-session.schema.ts
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
│  │  │  ├─ auth.ts
│  │  │  └─ ai/
│  │  │     └─ tool-registry.ts
│  │  ├─ proxy.ts
│  │  └─ next.config.ts
│  │
│  ├─ cron/
│  │  ├─ src/
│  │  │  ├─ index.ts
│  │  │  ├─ runners/
│  │  │  │  └─ enqueue-due-user-scheduled-jobs.ts
│  │  │  └─ health/
│  │  │     └─ healthcheck.ts
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  └─ tsup.config.ts
│  │
│  ├─ agent-worker/
│  │  ├─ src/
│  │  │  ├─ index.ts
│  │  │  ├─ process.ts
│  │  │  ├─ job-handler.ts
│  │  │  ├─ heartbeat.ts
│  │  │  ├─ infrastructure/
│  │  │  │  ├─ model-adapter.ts
│  │  │  │  ├─ billing-adapter.ts
│  │  │  │  ├─ portfolio-adapter.ts
│  │  │  │  ├─ market-data-adapter.ts
│  │  │  │  └─ jobs-adapter.ts
│  │  │  └─ __tests__/
│  │  │     ├─ setup.ts
│  │  │     ├─ in-memory-queue.mock.ts
│  │  │     └─ worker.smoke.test.ts
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  └─ tsup.config.ts
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
│     ├─ tsconfig.json
│     └─ tsup.config.ts
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
│  │  │  │  ├─ market-data.schema.ts
│  │  │  │  ├─ financial-statements.schema.ts
│  │  │  │  ├─ chat.schema.ts
│  │  │  │  ├─ ai.schema.ts
│  │  │  │  ├─ billing.schema.ts
│  │  │  │  ├─ automation.schema.ts
│  │  │  │  ├─ notification.schema.ts
│  │  │  │  └─ integrations.schema.ts
│  │  │  ├─ repositories/
│  │  │  │  ├─ ai-chat.repository.ts
│  │  │  │  ├─ portfolio.repository.ts
│  │  │  │  ├─ market-data.repository.ts
│  │  │  │  ├─ financial-statement.repository.ts
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
│  │  │  │     ├─ portfolio-valuation.service.ts
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
│  │  │  │     ├─ market-data-service.port.ts
│  │  │  │     └─ fx-rate-service.port.ts
│  │  │  └─ infrastructure/
│  │  │     └─ repositories/
│  │  │        └─ drizzle-portfolio.repository.ts
│  │  └─ package.json
│  │
│  ├─ market-data/
│  │  ├─ src/
│  │  │  ├─ index.ts
│  │  │  ├─ domain/
│  │  │  │  ├─ entities/
│  │  │  │  │  ├─ market-asset.entity.ts
│  │  │  │  │  ├─ price-candle.entity.ts
│  │  │  │  │  ├─ asset-price.entity.ts
│  │  │  │  │  ├─ fx-rate.entity.ts
│  │  │  │  │  ├─ financial-statement.entity.ts
│  │  │  │  │  ├─ financial-statement-line.entity.ts
│  │  │  │  │  └─ market-news.entity.ts
│  │  │  │  ├─ value-objects/
│  │  │  │  │  ├─ market-symbol.ts
│  │  │  │  │  ├─ market-code.ts
│  │  │  │  │  ├─ exchange-code.ts
│  │  │  │  │  ├─ candle-interval.ts
│  │  │  │  │  ├─ statement-period.ts
│  │  │  │  │  ├─ statement-type.ts
│  │  │  │  │  ├─ indicator-type.ts
│  │  │  │  │  └─ data-vendor.ts
│  │  │  │  └─ services/
│  │  │  │     ├─ price-normalizer.service.ts
│  │  │  │     ├─ candle-aggregator.service.ts
│  │  │  │     ├─ fx-conversion.service.ts
│  │  │  │     ├─ financial-statement-normalizer.service.ts
│  │  │  │     ├─ financial-ratio-calculator.service.ts
│  │  │  │     ├─ technical-indicator-calculator.service.ts
│  │  │  │     ├─ moving-average-calculator.service.ts
│  │  │  │     ├─ rsi-calculator.service.ts
│  │  │  │     ├─ macd-calculator.service.ts
│  │  │  │     ├─ bollinger-band-calculator.service.ts
│  │  │  │     ├─ valuation-metric-calculator.service.ts
│  │  │  │     └─ market-data-quality.service.ts
│  │  │  ├─ application/
│  │  │  │  ├─ commands/
│  │  │  │  │  ├─ refresh-asset-price.command.ts
│  │  │  │  │  ├─ refresh-price-candles.command.ts
│  │  │  │  │  ├─ refresh-fx-rates.command.ts
│  │  │  │  │  ├─ import-financial-statement.command.ts
│  │  │  │  │  ├─ calculate-financial-ratios.command.ts
│  │  │  │  │  ├─ calculate-technical-indicators.command.ts
│  │  │  │  │  └─ refresh-market-news.command.ts
│  │  │  │  ├─ queries/
│  │  │  │  │  ├─ get-latest-price.query.ts
│  │  │  │  │  ├─ get-price-history.query.ts
│  │  │  │  │  ├─ get-fx-rate.query.ts
│  │  │  │  │  ├─ get-financial-statement.query.ts
│  │  │  │  │  ├─ get-financial-ratios.query.ts
│  │  │  │  │  ├─ get-technical-indicators.query.ts
│  │  │  │  │  └─ search-market-news.query.ts
│  │  │  │  └─ ports/
│  │  │  │     ├─ market-data.repository.port.ts
│  │  │  │     ├─ price-provider.port.ts
│  │  │  │     ├─ candle-provider.port.ts
│  │  │  │     ├─ fx-rate-provider.port.ts
│  │  │  │     ├─ financial-statement-provider.port.ts
│  │  │  │     ├─ market-news-provider.port.ts
│  │  │  │     └─ market-calendar-provider.port.ts
│  │  │  └─ infrastructure/
│  │  │     ├─ repositories/
│  │  │     │  ├─ drizzle-market-data.repository.ts
│  │  │     │  └─ drizzle-financial-statement.repository.ts
│  │  │     ├─ price-providers/
│  │  │     │  ├─ composite-price.provider.ts
│  │  │     │  ├─ twelve-data.provider.ts
│  │  │     │  ├─ bist.provider.ts
│  │  │     │  ├─ yahoo-finance.provider.ts
│  │  │     │  └─ mock-price.provider.ts
│  │  │     ├─ candle-providers/
│  │  │     │  ├─ twelve-data-candle.provider.ts
│  │  │     │  ├─ yahoo-finance-candle.provider.ts
│  │  │     │  └─ mock-candle.provider.ts
│  │  │     ├─ fx-providers/
│  │  │     │  ├─ tcmb.provider.ts
│  │  │     │  ├─ exchangerate.provider.ts
│  │  │     │  └─ mock-fx.provider.ts
│  │  │     ├─ financial-statement-providers/
│  │  │     │  ├─ kap-financial-statement.provider.ts
│  │  │     │  ├─ sec-financial-statement.provider.ts
│  │  │     │  └─ mock-financial-statement.provider.ts
│  │  │     ├─ news-providers/
│  │  │     │  ├─ kap-announcement.provider.ts
│  │  │     │  ├─ market-news.provider.ts
│  │  │     │  └─ mock-news.provider.ts
│  │  │     └─ clients/
│  │  │        ├─ kap-client.ts
│  │  │        ├─ twelve-data-client.ts
│  │  │        ├─ yahoo-finance-client.ts
│  │  │        ├─ tcmb-client.ts
│  │  │        └─ sec-client.ts
│  │  └─ package.json
│  │
│  ├─ ai/
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  ├─ tsup.config.ts
│  │  └─ src/
│  │     ├─ index.ts
│  │     ├─ domain/
│  │     │  ├─ errors.ts
│  │     │  ├─ model/
│  │     │  │  ├─ model-descriptor.ts
│  │     │  │  └─ model-pricing.ts
│  │     │  ├─ tool/
│  │     │  │  ├─ tool-spec.ts
│  │     │  │  └─ tool-permission.ts
│  │     │  ├─ prompt/
│  │     │  │  └─ prompt-template.ts
│  │     │  └─ memory/
│  │     │     └─ conversation-memory.ts
│  │     ├─ application/
│  │     │  ├─ resolve-model.query.ts
│  │     │  ├─ list-available-models.query.ts
│  │     │  ├─ tool-registry.service.ts
│  │     │  ├─ tool-selector.service.ts
│  │     │  └─ default-tool-registry.factory.ts
│  │     └─ infrastructure/
│  │        ├─ gateway/
│  │        │  ├─ vercel-ai-gateway.client.ts
│  │        │  ├─ ai-sdk-model.factory.ts
│  │        │  └─ langchain-model.factory.ts
│  │        ├─ tools/
│  │        │  ├─ portfolio-tools.ts
│  │        │  ├─ market-data-tools.ts
│  │        │  ├─ financials-tools.ts
│  │        │  └─ automation-tools.ts
│  │        └─ prompts/
│  │           ├─ default-system.prompt.ts
│  │           └─ finance-system.prompt.ts
│  │
│  ├─ agent-runtime/
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  ├─ tsup.config.ts
│  │  └─ src/
│  │     ├─ index.ts
│  │     ├─ domain/
│  │     │  ├─ errors.ts
│  │     │  ├─ state.ts
│  │     │  ├─ state-helpers.ts
│  │     │  ├─ graph.ts
│  │     │  ├─ langgraph-annotation.ts
│  │     │  ├─ langgraph-node.ts
│  │     │  └─ ports/
│  │     │     ├─ agent-run-repository.port.ts
│  │     │     ├─ billing-gateway.port.ts
│  │     │     ├─ jobs-gateway.port.ts
│  │     │     ├─ market-data-gateway.port.ts
│  │     │     ├─ model-gateway.port.ts
│  │     │     └─ portfolio-gateway.port.ts
│  │     ├─ infrastructure/
│  │     │  ├─ composition.ts
│  │     │  ├─ agent-runtime.types.ts
│  │     │  ├─ graph-factory.ts
│  │     │  ├─ postgres-checkpointer.ts
│  │     │  └─ register-default-graphs.ts
│  │     ├─ nodes/
│  │     │  ├─ call-model.node.ts
│  │     │  ├─ reserve-credit.node.ts
│  │     │  ├─ finalize-usage.node.ts
│  │     │  ├─ pause-credit-insufficient.node.ts
│  │     │  └─ log-step-node.ts
│  │     ├─ subgraphs/
│  │     │  ├─ company-analysis.subgraph.ts
│  │     │  ├─ portfolio-review.subgraph.ts
│  │     │  └─ market-news.subgraph.ts
│  │     └─ __tests__/
│  │        ├─ setup.ts
│  │        ├─ composition.test.ts
│  │        ├─ state-helpers.test.ts
│  │        └─ in-memory-agent-run-repo.mock.ts
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
│  │  │  ├─ encryption/
│  │  │  │  ├─ secret-vault.ts
│  │  │  │  └─ encrypt-decrypt.ts
│  │  │  └─ webhooks/
│  │  │     ├─ webhook-signature.service.ts
│  │  │     └─ webhook-delivery.service.ts
│  │  └─ package.json
│  │
│  ├─ reports/
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  ├─ tsup.config.ts
│  │  └─ src/
│  │     ├─ index.ts
│  │     ├─ domain/
│  │     │  ├─ report-type.ts
│  │     │  └─ report-format.ts
│  │     ├─ application/
│  │     │  ├─ generate-report.command.ts
│  │     │  └─ export-report.command.ts
│  │     └─ infrastructure/
│  │        ├─ pdf/
│  │        │  └─ pdf-report.generator.ts
│  │        ├─ excel/
│  │        │  └─ excel-report.generator.ts
│  │        └─ markdown/
│  │           └─ markdown-report.generator.ts
│  │
│  ├─ jobs/
│  │  ├─ src/
│  │  │  ├─ index.ts
│  │  │  ├─ queue/
│  │  │  │  ├─ queue-client.ts
│  │  │  │  ├─ queue-names.ts
│  │  │  │  └─ job-payloads.ts
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
│  ├─ structure.md
│  ├─ billing.md
│  ├─ ai-agents.md
│  ├─ agent-runtime.md
│  ├─ agent-worker.md
│  ├─ langgraph.md
│  ├─ market-data.md
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
