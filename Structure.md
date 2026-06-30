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
│  │  │  ├─ workers/
│  │  │  │  ├─ langgraph-run.worker.ts
│  │  │  │  ├─ scheduled-job.worker.ts
│  │  │  │  ├─ portfolio-review.worker.ts
│  │  │  │  ├─ report-generation.worker.ts
│  │  │  │  ├─ market-data-refresh.worker.ts
│  │  │  │  └─ notification.worker.ts
│  │  │  ├─ processors/
│  │  │  │  ├─ langgraph-run.processor.ts
│  │  │  │  ├─ scheduled-job.processor.ts
│  │  │  │  ├─ portfolio-review.processor.ts
│  │  │  │  ├─ report-generation.processor.ts
│  │  │  │  ├─ market-data-refresh.processor.ts
│  │  │  │  └─ notification.processor.ts
│  │  │  └─ health/
│  │  │     └─ healthcheck.ts
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
│  │     ├─ gateway/
│  │     │  ├─ vercel-ai-gateway.client.ts
│  │     │  ├─ langchain-model.factory.ts
│  │     │  ├─ ai-sdk-model.factory.ts
│  │     │  ├─ model-registry.ts
│  │     │  ├─ provider-registry.ts
│  │     │  └─ model-pricing.ts
│  │     ├─ tools/
│  │     │  ├─ registry/
│  │     │  │  ├─ tool-registry.ts
│  │     │  │  ├─ tool-selector.ts
│  │     │  │  └─ tool-permissions.ts
│  │     │  ├─ portfolio/
│  │     │  │  ├─ add-transaction.tool.ts
│  │     │  │  ├─ get-portfolio-overview.tool.ts
│  │     │  │  ├─ get-positions.tool.ts
│  │     │  │  └─ calculate-portfolio-health.tool.ts
│  │     │  ├─ market-data/
│  │     │  │  ├─ get-delayed-price.tool.ts
│  │     │  │  ├─ get-price-history.tool.ts
│  │     │  │  ├─ get-fx-rate.tool.ts
│  │     │  │  ├─ get-technical-indicators.tool.ts
│  │     │  │  ├─ get-financial-ratios.tool.ts
│  │     │  │  └─ search-market-news.tool.ts
│  │     │  ├─ financials/
│  │     │  │  ├─ get-financial-statement.tool.ts
│  │     │  │  ├─ get-income-statement.tool.ts
│  │     │  │  ├─ get-balance-sheet.tool.ts
│  │     │  │  ├─ get-cash-flow.tool.ts
│  │     │  │  └─ analyze-financial-statement.tool.ts
│  │     │  └─ automation/
│  │     │     ├─ create-scheduled-job.tool.ts
│  │     │     ├─ pause-scheduled-job.tool.ts
│  │     │     └─ list-scheduled-jobs.tool.ts
│  │     ├─ prompts/
│  │     │  ├─ system/
│  │     │  │  ├─ default-system.prompt.ts
│  │     │  │  ├─ finance-system.prompt.ts
│  │     │  │  └─ safety.prompt.ts
│  │     │  ├─ agents/
│  │     │  └─ workflows/
│  │     ├─ memory/
│  │     │  ├─ user-memory.service.ts
│  │     │  ├─ conversation-memory.service.ts
│  │     │  ├─ investment-preference-memory.ts
│  │     │  └─ memory-policy.ts
│  │     └─ telemetry/
│  │        ├─ ai-usage-extractor.ts
│  │        ├─ ai-event-recorder.ts
│  │        └─ source-normalizer.ts
│  │
│  ├─ agent-runtime/
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  ├─ tsup.config.ts
│  │  └─ src/
│  │     ├─ index.ts
│  │     ├─ langgraph/
│  │     │  ├─ graph-registry.ts
│  │     │  ├─ graph-runner.ts
│  │     │  ├─ graph-checkpointer.ts
│  │     │  ├─ graph-state.ts
│  │     │  ├─ graph-context.ts
│  │     │  └─ graph-events.ts
│  │     ├─ graphs/
│  │     │  ├─ portfolio-review.graph.ts
│  │     │  ├─ company-analysis.graph.ts
│  │     │  ├─ technical-analysis.graph.ts
│  │     │  ├─ deep-research.graph.ts
│  │     │  ├─ transaction-capture.graph.ts
│  │     │  └─ report-generation.graph.ts
│  │     ├─ nodes/
│  │     │  ├─ router.node.ts
│  │     │  ├─ portfolio/
│  │     │  │  ├─ load-portfolio.node.ts
│  │     │  │  ├─ calculate-portfolio-health.node.ts
│  │     │  │  └─ generate-portfolio-advice.node.ts
│  │     │  ├─ market-data/
│  │     │  │  ├─ load-prices.node.ts
│  │     │  │  ├─ load-financial-statements.node.ts
│  │     │  │  ├─ calculate-ratios.node.ts
│  │     │  │  └─ calculate-indicators.node.ts
│  │     │  ├─ research/
│  │     │  │  ├─ plan-research.node.ts
│  │     │  │  ├─ run-parallel-research.node.ts
│  │     │  │  ├─ summarize-sources.node.ts
│  │     │  │  └─ synthesize-answer.node.ts
│  │     │  ├─ billing/
│  │     │  │  ├─ reserve-credit.node.ts
│  │     │  │  ├─ finalize-usage.node.ts
│  │     │  │  └─ pause-credit-insufficient.node.ts
│  │     │  └─ human/
│  │     │     ├─ request-approval.node.ts
│  │     │     └─ wait-for-user-input.node.ts
│  │     ├─ state/
│  │     │  ├─ portfolio-review.state.ts
│  │     │  ├─ company-analysis.state.ts
│  │     │  ├─ deep-research.state.ts
│  │     │  ├─ report-generation.state.ts
│  │     │  └─ shared-agent.state.ts
│  │     ├─ persistence/
│  │     │  ├─ drizzle-checkpointer.ts
│  │     │  ├─ agent-run.repository.ts
│  │     │  ├─ agent-run-step.repository.ts
│  │     │  └─ graph-snapshot.repository.ts
│  │     ├─ subagents/
│  │     │  ├─ portfolio-advisor.subagent.ts
│  │     │  ├─ financial-statement.subagent.ts
│  │     │  ├─ technical-analysis.subagent.ts
│  │     │  ├─ research.subagent.ts
│  │     │  ├─ risk-profile.subagent.ts
│  │     │  └─ report-writer.subagent.ts
│  │     └─ events/
│  │        ├─ agent-run-started.event.ts
│  │        ├─ agent-run-paused.event.ts
│  │        ├─ agent-run-resumed.event.ts
│  │        ├─ agent-run-completed.event.ts
│  │        └─ agent-node-completed.event.ts
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
