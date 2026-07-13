/**
 * @openbulls/automation — the 6 built-in executors.
 *
 * One factory per executor type. Each factory returns an
 * `IExecutor<TPayload>` that:
 *   1. Validates its raw `inputPayload` via a Zod schema
 *      (`buildPayload`).
 *   2. Enqueues the appropriate downstream job via the injected
 *      `JobsServices` (`run`).
 *
 * Composability: factories take the *minimum* set of dependencies
 * (typically `JobsServices`; `price_alert` also takes the market
 * data gateway). `default-registry.factory.ts` wires them together.
 *
 * Idempotency: every `run()` enqueues a *fresh* BullMQ job. A redelivery
 * would enqueue another job — that's intentional; downstream consumers
 * (`agent-run`, `notification-dispatch`) are themselves idempotent.
 *
 * Validation: `buildPayload` always throws `ExecutorInvalidPayloadError`
 * on schema mismatch (never `Result`). The dispatcher catches it and
 * marks the execution `failed` with the reason string.
 *
 * Default values: schemas use `.optional()` (not `.default()`) so the
 * inferred Zod type is `T | undefined`; we resolve defaults at parse
 * time inside each executor. This keeps the executor's `TPayload`
 * non-Partial (the default values are part of the contract).
 */
import { randomUUID } from "node:crypto";

import { z } from "zod";

import type { IMarketDataGateway } from "@openbulls/agent-runtime";
import type { JobsServices } from "@openbulls/jobs";

import { ExecutorInvalidPayloadError, type ExecutorType, type IExecutor } from "../domain";

// ── Schemas ──────────────────────────────────────────────────────────────
//
// All fields are `.optional()` so the Zod inferred type carries
// `T | undefined`; default values are applied by `applyDefaults()`.

const portfolioReviewPayloadSchema = z.object({
  reviewKind: z.string().min(1).optional(),
  notes: z.string().optional(),
});

const priceAlertPayloadSchema = z.object({
  symbols: z.array(z.string().min(1)).min(1),
  threshold: z.number().positive(),
  direction: z.enum(["above", "below"]),
});

const newsWatchPayloadSchema = z.object({
  symbols: z.array(z.string()).optional(),
  topics: z.array(z.string()).optional(),
});

const earningsCalendarPayloadSchema = z.object({
  symbols: z.array(z.string()).min(1),
  daysAhead: z.number().int().positive().max(365).optional(),
});

const customAgentPayloadSchema = z.object({
  graphKey: z.string().min(1),
  input: z.record(z.string(), z.unknown()).optional(),
});

const reportRenderPayloadSchema = z.object({
  reportType: z.string().min(1),
  format: z.enum(["pdf", "excel", "markdown"]),
  parameters: z.record(z.string(), z.unknown()).default({}),
  title: z.string().optional(),
  locale: z.enum(["tr", "en"]).optional(),
});

// ── Payload value types ──────────────────────────────────────────────────
//
// These are the *post-default* shapes — what `buildPayload` returns
// and what `run(ctx)` consumes.

export interface PortfolioReviewPayload {
  reviewKind: string;
  notes?: string;
}

export interface PriceAlertPayload {
  symbols: string[];
  threshold: number;
  direction: "above" | "below";
}

export interface NewsWatchPayload {
  symbols: string[];
  topics: string[];
}

export interface EarningsCalendarPayload {
  symbols: string[];
  daysAhead: number;
}

export interface CustomAgentPayload {
  graphKey: string;
  input: Record<string, unknown>;
}

export interface ReportRenderPayload {
  reportType: string;
  format: "pdf" | "excel" | "markdown";
  parameters: Record<string, unknown>;
  title?: string;
  locale?: string;
}
// ── Parser ───────────────────────────────────────────────────────────────

function parse<T>(
  executorType: ExecutorType,
  schema: z.ZodType<T>,
  raw: Readonly<Record<string, unknown>>,
): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ExecutorInvalidPayloadError(`executor ${executorType} payload validation failed`, {
      executorType,
      jobDefinitionKey: "<pending>",
      reason: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    });
  }
  return result.data;
}

// ── Portfolio review executors ──────────────────────────────────────────

function createPortfolioReviewExecutor(
  jobs: JobsServices,
  type: "portfolio_daily_review" | "portfolio_weekly_review",
): IExecutor<PortfolioReviewPayload> {
  return {
    type,
    buildPayload(raw): PortfolioReviewPayload {
      const parsed = parse(type, portfolioReviewPayloadSchema, raw);
      const result: PortfolioReviewPayload = {
        reviewKind: parsed.reviewKind ?? "daily",
      };
      if (parsed.notes !== undefined) {
        result.notes = parsed.notes;
      }
      return result;
    },
    async run(ctx) {
      const threadId = randomUUID();
      const result = await jobs.enqueueAgentRun({
        userId: ctx.userId,
        graphKey: "portfolio-review",
        threadId,
        input: {
          reviewKind: ctx.payload.reviewKind,
          ...(ctx.payload.notes !== undefined ? { notes: ctx.payload.notes } : {}),
        },
      });
      if (!result.ok) {
        ctx.logger.error(`${type}: enqueueAgentRun failed`, {
          err: result.error.message,
        });
        return { kind: "agent-run", downstreamJobIds: [] };
      }
      return {
        kind: "agent-run",
        downstreamJobIds: [result.value.jobId],
        notes: `threadId=${threadId}`,
      };
    },
  };
}

export function createPortfolioDailyReviewExecutor(deps: {
  readonly jobs: JobsServices;
}): IExecutor<PortfolioReviewPayload> {
  return createPortfolioReviewExecutor(deps.jobs, "portfolio_daily_review");
}

export function createPortfolioWeeklyReviewExecutor(deps: {
  readonly jobs: JobsServices;
}): IExecutor<PortfolioReviewPayload> {
  return createPortfolioReviewExecutor(deps.jobs, "portfolio_weekly_review");
}

// ── Price alert executor ────────────────────────────────────────────────

export function createPriceAlertExecutor(deps: {
  readonly jobs: JobsServices;
  readonly marketData: IMarketDataGateway;
}): IExecutor<PriceAlertPayload> {
  const type: ExecutorType = "price_alert";
  return {
    type,
    buildPayload(raw): PriceAlertPayload {
      return parse(type, priceAlertPayloadSchema, raw);
    },
    async run(ctx) {
      const downstream: string[] = [];
      for (const symbol of ctx.payload.symbols) {
        try {
          const quote = await deps.marketData.getQuote({ symbol });
          // Quote return is a tagged union; coerce to a numeric `last`
          // here. The exact union narrows in `market-data`'s app layer.
          const last =
            typeof (quote as { last?: unknown }).last === "number"
              ? (quote as { last: number }).last
              : Number.NaN;
          if (Number.isNaN(last)) continue;
          const crossed =
            ctx.payload.direction === "above"
              ? last > ctx.payload.threshold
              : last < ctx.payload.threshold;
          if (!crossed) continue;
          const enqueue = await deps.jobs.enqueueNotificationDispatch({
            userId: ctx.userId,
            notificationKind: "price_alert",
            payload: {
              symbol,
              last,
              threshold: ctx.payload.threshold,
              direction: ctx.payload.direction,
            },
          });
          if (enqueue.ok) downstream.push(enqueue.value.jobId);
        } catch (err) {
          ctx.logger.warn("price_alert: quote fetch failed", {
            symbol,
            err: String(err),
          });
        }
      }
      if (downstream.length === 0) {
        return {
          kind: "noop",
          downstreamJobIds: [],
          notes: "no symbols crossed threshold",
        };
      }
      return { kind: "notification", downstreamJobIds: downstream };
    },
  };
}

// ── News watch executor ─────────────────────────────────────────────────

export function createNewsWatchExecutor(deps: {
  readonly jobs: JobsServices;
}): IExecutor<NewsWatchPayload> {
  const type: ExecutorType = "news_watch";
  return {
    type,
    buildPayload(raw): NewsWatchPayload {
      const parsed = parse(type, newsWatchPayloadSchema, raw);
      return {
        symbols: parsed.symbols ?? [],
        topics: parsed.topics ?? [],
      };
    },
    async run(ctx) {
      const result = await deps.jobs.enqueueAgentRun({
        userId: ctx.userId,
        graphKey: "market-news",
        threadId: randomUUID(),
        input: { symbols: ctx.payload.symbols, topics: ctx.payload.topics },
      });
      const downstream: string[] = [];
      if (result.ok) downstream.push(result.value.jobId);
      // Faz 6 will append an enqueueNotificationDispatch; Faz 5
      // is intentionally minimal so the consumer can be added later
      // without a migration.
      return { kind: "agent-run", downstreamJobIds: downstream };
    },
  };
}

// ── Earnings calendar watch executor (Faz 5: noop) ──────────────────────

export function createEarningsCalendarWatchExecutor(_deps: {
  readonly jobs: JobsServices;
}): IExecutor<EarningsCalendarPayload> {
  const type: ExecutorType = "earnings_calendar_watch";
  return {
    type,
    buildPayload(raw): EarningsCalendarPayload {
      const parsed = parse(type, earningsCalendarPayloadSchema, raw);
      return { symbols: parsed.symbols, daysAhead: parsed.daysAhead ?? 7 };
    },
    async run(_ctx) {
      // Faz 5: calendar data provider lands in Faz 8. For now we
      // accept the job, validate the payload, and immediately mark
      // the execution as a no-op so the dispatcher advances
      // nextRunAt cleanly.
      return {
        kind: "noop",
        downstreamJobIds: [],
        notes: "earnings_calendar_watch not yet wired (Faz 8)",
      };
    },
  };
}

// ── Custom agent executor ───────────────────────────────────────────────

export function createCustomAgentExecutor(deps: {
  readonly jobs: JobsServices;
}): IExecutor<CustomAgentPayload> {
  const type: ExecutorType = "custom_agent";
  return {
    type,
    buildPayload(raw): CustomAgentPayload {
      const parsed = parse(type, customAgentPayloadSchema, raw);
      return { graphKey: parsed.graphKey, input: parsed.input ?? {} };
    },
    async run(ctx) {
      const threadId = randomUUID();
      const result = await deps.jobs.enqueueAgentRun({
        userId: ctx.userId,
        graphKey: ctx.payload.graphKey,
        threadId,
        input: ctx.payload.input,
      });
      if (!result.ok) {
        ctx.logger.error("custom_agent: enqueueAgentRun failed", {
          err: result.error.message,
        });
        return { kind: "agent-run", downstreamJobIds: [] };
      }
      return {
        kind: "agent-run",
        downstreamJobIds: [result.value.jobId],
        notes: `jobId=${result.value.jobId} threadId=${threadId}`,
      };
    },
  };
}

// ── Report render executor (Faz 7) ────────────────────────────────────────
//
// Enqueues a `report-render` BullMQ job. The agent-worker picks it
// up and runs `apps/agent-worker/src/report-render-handler.ts`,
// which calls @openbulls/reports `renderReport` (insert → render →
// upload → markReady). Format / type / parameters flow through
// unchanged so the subgraph-prepared scratchpad and the report
// orchestrator speak the same vocabulary.

export function createReportRenderExecutor(deps: {
  readonly jobs: JobsServices;
}): IExecutor<ReportRenderPayload> {
  const type: ExecutorType = "report_render";
  return {
    type,
    buildPayload(raw): ReportRenderPayload {
      const parsed = parse(type, reportRenderPayloadSchema, raw);
      return {
        reportType: parsed.reportType,
        format: parsed.format,
        parameters: parsed.parameters ?? {},
        ...(parsed.title !== undefined ? { title: parsed.title } : {}),
        ...(parsed.locale !== undefined ? { locale: parsed.locale } : {}),
      };
    },
    async run(ctx) {
      const result = await deps.jobs.enqueueReportRender({
        userId: ctx.userId,
        reportType: ctx.payload.reportType,
        format: ctx.payload.format,
        payload: ctx.payload.parameters,
      });
      if (!result.ok) {
        ctx.logger.error("report_render: enqueueReportRender failed", {
          err: result.error.message,
        });
        return { kind: "report", downstreamJobIds: [] };
      }
      return {
        kind: "report",
        downstreamJobIds: [result.value.jobId],
        notes: `jobId=${result.value.jobId}`,
      };
    },
  };
}
