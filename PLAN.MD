# Openbulls — Geliştirme Planı (PLAN.MD)

Bu dosya **ileriye dönük** yol haritasıdır — ne yapılacak, hangi sırayla, neden.
Tamamlanan işler `git log` ve dosya geçmişinde.

---

## 1. Vizyon

Openbulls; AI sohbet asistanı, portföy takip, piyasa verisi, finansal tablo analizi, teknik indikatörler, kullanıcı kredi/billing, LangGraph tabanlı uzun-süreli ajan akışları, paralel ajan yürütme, kullanıcının oluşturduğu zamanlanmış işler ve Telegram/web/e-posta bildirimleri ile PDF/Excel raporlama sunan bir platformdur.

## 2. Mimari Prensipler (CLAUDE.md)

- **App'ler ince**: yalnızca route, API handler, UI birleştirme, process giriş noktaları.
- **`apps/web` uzun iş akışı çalıştırmaz** — sadece kuyruğa alır.
- **`apps/agent-worker` LangGraph çalıştırır** — uzun ajan işleri burada.
- **`apps/cron` generik**: kullanıcı zamanlanmış işleri DB'de, executor'lar `packages/automation`'da.
- **Domain mantığı paketlerde**: package → `domain/`, `application/`, `infrastructure/`.
- **Market data kendi paketi**: `packages/market-data`. Integration paketi sadece generic glue.
- **AI tool'ları package servislerini çağırır** — tool içinde business logic yok.
- **Agent runtime paketi** (`packages/agent-runtime`) tüm graph tanımlarını içerir.
- **Billing merkezi** — agent'larda billing guard'lar (reserve / finalize / pause).
- **Ajan run'ları resumable** — `ai_agent_runs`, `ai_agent_run_steps`, `agent_graph_snapshots`.
- **Drizzle**, typed repository portları, zod validation, no `any`.

## 3. Hedef Mimari

```txt
apps/
  web/                  (mevcut, geliştirilecek)
  cron/                 (boş)
  agent-worker/         (boş)
  telegram-bot/         (boş)

packages/
  db/                   (mevcut)
  auth/                 (mevcut, server.ts + client.ts)
  shared/               (dolu — Result, AppError, brands, Pagination)
  ui/                   (mevcut, shadcn primitives)
  portfolio/            (iskelet)
  market-data/          (iskelet — KAP/SEC/TCMB/Yahoo/Twelve adapterleri)
  ai/                   (iskelet — Vercel AI SDK + Gateway, prompt/tool/telemetry)
  agent-runtime/        (iskelet — LangGraph graphs, state, checkpointing)
  automation/           (iskelet — kullanıcı zamanlanmış iş DSL'i)
  billing/              (dolu — plan, kredi, Stripe + iyzico gateway)
  notifications/        (iskelet — telegram, e-posta, web push)
  integrations/         (iskelet — generic integration glue, encryption, webhook sig)
  reports/              (iskelet — PDF/Excel üreteci)
  jobs/                 (iskelet — queue abstraction)
  config/               (mevcut, serverEnv + clientEnv)
  logger/               (iskelet — yapısal log)
  i18n/                 (mevcut, sadeleştirilmiş)
```

## 4. Yol Haritası

Her faz tamamlanmadan sonrakine geçilmez. Her faz sonunda `pnpm -r typecheck` + `pnpm -F @openbulls/web build` temiz.

### Faz 1 — `packages/market-data` (Kritik Bağımlılık) ✅ Done

Hedef: Piyasa verisi domain'i kendi başına çalışır. Portföy, AI tool'ları, raporlar buna dayanacak — erken inşa edilmesi ileride her şeyi hızlandırır.

**Yapılacaklar:**

- `domain/`: `Candle`, `Price`, `Quote`, `FinancialStatement`, `Indicator` value object'leri.
- `application/`: `GetCandlesQuery`, `GetQuoteQuery`, `GetFinancialRatiosQuery`, `CalculateRSIQuery`, ...
- `infrastructure/` provider adapter'leri:
  - `YahooFinanceAdapter`
  - `TwelveDataAdapter`
  - `KAPAdapter` (Türkiye)
  - `TCMBAdapter` (döviz)
  - `SECAdapter` (ABD)
- Provider router + rate limiting + retry.
- Test altyapısı: `vitest` + MSW veya recorded HTTP fixture.

**Bağımlılık:** `db` (veri cache), `config` (API key), `logger`.

**Çıktı:** `pnpm -F @openbulls/market-data test` provider'lar için tutarlı sonuç döner. *(14 commit, 41/41 test geçer, vitest + MSW altyapısı, composition root, public barrel.)*

### Faz 2 — `packages/portfolio` ✅ Done

Hedef: Kullanıcı portföy verisi, hisse senedi/kripto/nakit varlıklar, performans hesabı.

**Yapılacaklar:**

- `domain/`: `Holding`, `Transaction`, `Portfolio`, `Position`, `PnL`.
- `application/`: `AddTransactionCommand`, `ImportSnapshotCommand`, `GetPortfolioOverviewQuery`.
- `infrastructure/`:
  - `drizzle/` schema'sı `packages/db`'ye eklenir.
  - Repository implementasyonları, port + adapter.
- Performans: `TotalReturn`, `TimeWeightedReturn`, `MaxDrawdown` hesaplayıcıları.
- Çoklu para birimi: `packages/market-data` ile FX çevirimi.

**Bağımlılık:** `db`, `market-data`.

**Çıktı:** Bir kullanıcı transaction kaydeder → portfolio query güncel snapshot + FX-adjusted performans döner.

*(17 commit: brands + VOs + errors + 4 pure services + ports + 10 use cases + composition root + barrel + vitest/MSW + 35 test. db/portfolio extended with archive + listTransactions + insertTransaction + upsertHolding.)*

### Faz 3 — `packages/agent-runtime` + `packages/jobs` + `apps/agent-worker` ✅ Done

Hedef: LangGraph merkezli ajan çalışma zamanı + kuyruk + işçi. Uzatılmış/resumable akışlar.

**Yapılacaklar:**

- `packages/agent-runtime`:
  - `graph-registry.ts`, `state-schema.ts`, `checkpointing.ts` (Postgres checkpoint backend).
  - `subgraphs/`: `company-analysis.subagent.ts`, `portfolio-review.subagent.ts`, `market-news.subagent.ts`.
  - `nodes/`: `reserve-credit.node.ts`, `finalize-usage.node.ts`, `pause-credit-insufficient.node.ts` (billing entegrasyonu).
- `packages/jobs`:
  - Queue abstraction (BullMQ + Redis), job tipleri.
  - Job lifecycle hooks.
- `apps/agent-worker`:
  - `worker.ts` — kuyruktan job al, LangGraph run başlat, streaming updates.
  - Rate limit + concurrency.
- DB şeması: `ai_agent_runs`, `ai_agent_run_steps`, `ai_tool_calls`, `ai_usage_events`, `agent_graph_snapshots`.

**Bağımlılık:** `db`, `billing`, `market-data`, `portfolio`, `integrations` (Redis URL), `config`.

**Çıktı:** Test agent run'u başlat, 3 adım tamamla, kill worker, restart — checkpoint'ten devam et.

*(19 commit, 40 test geçer — `jobs` 12 + `agent-runtime` 26 + `agent-worker` 2 smoke. BullMQ+Redis queue, custom Drizzle checkpointer (`DrizzleCheckpointerSaver`), 3 subgraph (company-analysis paralel 4 subagent + portfolio-review + market-news), billing guard'lar reserve/finalize/pause-insufficient destekli, `runGraph` + `resumeRun` helper'ları + DB port genişletmesi `steps/tool_calls/usage_events/snapshots`. `packages/billing` public barrel açıldı, `packages/logger` 4-method `LoggerLike` + `noopLogger` eklendi. Branch: `faz-3/agent-runtime-jobs-worker`.)*

**Faz 3.5 — LangGraph Wiring (post-merge follow-up) ✅ Done**

İlk merge'de custom state machine üzerinden çalışan Faz 3, plan'ın açık emrine (CLAUDE.md §6) aykırıydı. PR #2 ile tam LangGraph wiring'e geçildi:

- `packages/agent-runtime` artık `@langchain/langgraph` `StateGraph` + `CompiledStateGraph` üzerine kurulu. Custom `run-graph.ts`, `GraphRegistry`, `GraphDefinition`, `defineNode`, `DrizzleCheckpointerSaver` hepsi silindi.
- Checkpoint backend: `@langchain/langgraph-checkpoint-postgres` `PostgresSaver` (yeni tablo şeması `checkpoints` / `checkpoint_blobs` / `checkpoint_writes`). Eski `agent_graph_snapshots` tablosu deprecated.
- `company-analysis` subgraph: `Send` API ile 4 analitik dal paralel (CLAUDE.md §10 uygulanmış).
- Public API: `createCompiledGraphBundle` + `bundle.invoke/stream`. `runGraph`/`resumeRun`/`pauseRun` façade'ları kaldırıldı.
- `apps/agent-worker` artık `bundle.invoke(key, state, {threadId, userId})` çağırıyor. Resume thread_id ile built-in.

*(Branch: `faz-X/langgraph-wiring`, 11 commit. agent-runtime 5/5 test, agent-worker smoke test adapt edildi. Paketler: `@langchain/core`, `@langchain/langgraph`, `@langchain/langgraph-checkpoint-postgres`.)*

**Faz 4'e köprü:** `packages/agent-runtime`'un `IModelGateway` port'u abstract; Faz 4'te `packages/ai` Vercel AI SDK / AI Gateway ile bu port'un implementasyonunu sağlayacak. `enqueueAgentRun` komutu Faz 3'te `apps/web`'den çağrılmak üzere hazır. Worker heartbeat + graceful shutdown Faz 3'te yerleşti. Faz 4'te `apps/web` chat UI (`ai-elements`), streaming yanıt ve `useChat` + server action → `enqueueAgentRun` bağlantısı kurulacak. `packages/automation` executor'ları Faz 5'te `enqueueAgentRun` ile tetiklenecek.

### Faz 4 — `packages/ai` + `apps/web` AI Chat UI ✅ Done

Hedef: Vercel AI SDK + AI Gateway entegrasyonu, model seçimi, streaming chat UX, tool binding, subgraph model sentezi.

**Yapılacaklar:**

- `packages/ai`:
  - `domain/`: `model/`, `tool/`, `prompt/`, `errors.ts` (ModelKey brand, ToolSpec generic, PromptTemplate renderer).
  - `application/`: `resolve-model.query.ts` (hardcoded registry Faz 4'te, Faz 5'te DB-backed), `list-available-models.query.ts`, `tool-registry.service.ts`, `tool-selector.service.ts`, `default-tool-registry.factory.ts` (18 starter tool).
  - `infrastructure/`:
    - `gateway/`: `vercel-ai-gateway.client.ts`, `ai-sdk-model.factory.ts`, `langchain-model.factory.ts`.
    - `tools/portfolio/` (4 tool), `tools/market-data/` (6 tool), `tools/financials/` (5 tool), `tools/automation/` (3 tool) — her tool `package application command/query`'yi çağırır (CLAUDE.md §8).
    - `prompts/finance-system.prompt.ts`, `prompts/default-system.prompt.ts`.
- `packages/agent-runtime`:
  - `IModelGateway` port (Faz 3'te abstract idi; Faz 4'te somut).
  - `call-model.node.ts` — generic system + messages + tools → reply + usage.
  - 3 subgraph artık model çağırır: `synthesize-company-analysis`, `synthesize-portfolio-review`, `summarize-market-news`.
- `apps/agent-worker`:
  - `model-adapter.ts` — `IModelGateway` implementasyonu (LangChain `createChatModel` + `resolveModel` + provider-specific API key).
- `apps/web`:
  - `/api/chat` streaming endpoint (`ai@7` `streamText` + `result.toUIMessageStreamResponse()`).
  - `useChatModel` hook — hand-rolled fetch-based streaming (peer dep çakışması `@ai-sdk/react` ↔ `ai@7` nedeniyle `@ai-sdk/react` çıkarıldı).
  - Server actions: `list-chat-sessions`, `get-chat-session`, `create-chat-session`, `save-chat-message`.
  - Chat surface: `ChatShell` (composition root), `ChatMessage`, `PromptInput`, `ModelSelector`, `SessionSidebar`, `AgentModeToggle` (quick/deep), `ToolCallCard`, `SourcesList` (hepsi `ai-elements` primitives etrafında ince wrapper).
  - Chat routes: `/[locale]/dashboard/chat` (liste), `/[locale]/dashboard/chat/[sessionId]` (akış).

**Bağımlılık:** `agent-runtime`, `billing`, `market-data`, `portfolio`, `config`.

**Çıktı:** Chat'te "THYAO portföyümü nasıl etkiler?" → `streamText` (Vercel AI SDK) → tool binding (`getPortfolioOverview` / `getFinancialStatement` / ...) → streaming markdown response → `chat_messages`'a persist. "Derin analiz" toggle → `enqueueAgentRun({graphKey: "company-analysis"})` → `apps/agent-worker` → subgraph → model sentezi.

*(7 commit: domain → gateway → 18 tool → IModelGateway + callModelNode + subgraph integration → chat route + streaming API + actions + tool binding → chat UI components (shell + message + model-selector + tool-call-card + sources-list + prompt-input + session-sidebar + agent-mode-toggle) → chore plan sync.)*

**Faz 5'e köprü:** Subgraph'lar artık `IModelGateway` üzerinden model çağırır — Faz 5'te `packages/automation` executor'ları `enqueueAgentRun` ile tetiklenecek. `apps/cron` runner'ı (`enqueueDueUserScheduledJobs`) `packages/automation`'a dispatch edecek. `packages/ai` tool selector Faz 5'te LLM-assisted'e evrilecek. `model_pricing` DB tablosu Faz 5'te hardcoded registry'nin yerini alacak. User-memory + investment-preference-memory Faz 5'te conversation-memory'ye eklenir. Tool call UI'ı (`tool-*` event parsing) Faz 5'te `useChatModel`'e eklenecek.

### Faz 5 — `apps/cron` + `packages/automation`

Hedef: Kullanıcının oluşturduğu zamanlanmış işler generik. Hard-coded cron job yok.

**Yapılacaklar:**

- `apps/cron`:
  - `find-due-jobs.ts` (sadece due job'ları bulur).
  - `dispatch.ts` (executor'a iletir).
- `packages/automation`:
  - Job DSL (`schedule`, `trigger`, `action`).
  - Executor pattern: her job tipi için executor (`market-data-refresh`, `portfolio-snapshot`, `report-generate`).
  - Executor, LangGraph run'ı kuyruğa alır (`packages/jobs`).

**Bağımlılık:** `db`, `jobs`, `agent-runtime`, `market-data`, `portfolio`.

**Çıktı:** "Her Cuma 18:00'de portföy snapshot'ı al + e-posta gönder" işi DB'de tutulur, cron dispatcher executor'a iletir.

### Faz 6 — `packages/notifications` + `apps/telegram-bot`

Hedef: Çok kanallı bildirim. Telegram bot bağımsız app olarak çalışır, kullanıcı kimliği better-auth ile eşleşir.

**Yapılacaklar:**

- `packages/notifications`:
  - `domain/`: `Notification`, `ChannelType`.
  - `application/`: `SendNotificationCommand`, `SubscribeToEventCommand`.
  - `infrastructure/`: `TelegramChannel`, `EmailChannel`, `WebPushChannel`.
- `apps/telegram-bot`:
  - Long polling veya webhook.
  - Komut listesi: `/balance`, `/portfolio`, `/analyze THYAO`, `/notify <event>`.

**Bağımlılık:** `auth`, `portfolio`, `market-data`, `config`, `integrations`.

**Çıktı:** Kullanıcı Telegram'da `/balance` yazarsa anlık cevap gelir; ajan bir event üretirse eşzamanlı telegram/e-posta bildirimi çıkar.

### Faz 7 — `packages/reports`

Hedef: PDF (A4 kararları, grafikler) + Excel (yapılandırılmış tablo) üretimi. LangGraph `report-writer` subgraph'i sonucu render eder.

**Yapılacaklar:**

- Template engine (Handlebars veya MJML benzeri).
- Grafik çıktısı (svg → png dönüşümü veya headless chart).
- Multi-dil rapor (i18n entegrasyonu).
- Storage adapter (S3 veya local).

**Bağımlılık:** `market-data`, `portfolio`, `agent-runtime`, `config`.

**Çıktı:** `/report generate monthly` → arka planda LangGraph → PDF e-posta ile gelir.

### Faz 8 — `packages/integrations` Polish + Web Production Hardening

- Generic external integrations: token, webhook signature, encryption.
- `apps/web`:
  - 404/500 pages (tüm dillerde).
  - Rate limiting.
  - Security headers (`next.config.ts`).
  - Accessibility audit.
  - SEO: sitemap, robots.txt.
  - Error boundary.
  - Loading skeleton.
- `packages/logger`: structured logger (pino veya benzeri), tüm paketlerde.
- `packages/shared` son dolgu.
- CI (turbo.json lint/typecheck/build pipeline).

---

## 5. Açık Kararlar

- **Ödeme gateway**: iyzico (TR) ve Stripe (global) — ikisi de `packages/billing/infrastructure/`'da adapter olarak hazır.
- **Kuyruk**: BullMQ + Redis (önerilen). Postgres-backed alternatif Faz 3'te değerlendirilebilir.
- **LangGraph checkpoint backend**: Postgres (`@langgraph/checkpoint-postgres`) tercih edilebilir.
- **Real-time UI**: SSE veya websocket — ileride seçilir.

## 6. Faz Sırasında Yapılmayan Şeyler

- UI primitiflerinin yeniden tasarımı (`packages/ui` dokunulmaz).
- Authentication altyapısının (`packages/auth`) elden geçirilmesi (sadece `nextCookies` plugin gibi düzeltmeler).
- Mevcut `apps/web` route'larının kapsamlı refactor'ü (sadece hedefli bug fix + i18n temizliği).
- Hard-coded UI kopyalarının i18n kataloguna taşınması (kullanıcı istemedi).

---

## 7. Başarı Kriteri (Faz 8 sonu)

- `pnpm -F @openbulls/web build` ve `pnpm -F @openbulls/agent-worker build` temiz.
- Bir kullanıcı:
  1. Sign-up → email doğrulama (gerekirse) → plan seç → kredi satın al.
  2. Portföy transaction ekler → anlık performans görür.
  3. Chat'te "THYAO analizi yap" der → LangGraph 4 subagent paralel çalıştırır → billing düğümleri credit reserve eder → sonuç chat'e akar.
  4. "Her Pazar portföy raporu" zamanlanmış işi kurar → cron dispatcher'ı executor'a iletir → Pazartesi sabahı PDF e-posta ile gelir.
  5. Telegram bot'a `/balance` yazar → anlık cevap alır.
- Tüm adımlarda billing guard devrede; credit biterse run durur, sonraki valid checkpoint'ten devam eder.
