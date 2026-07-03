/**
 * @openbulls/automation — executor port and runtime context.
 *
 * The executor pattern is the spine of `packages/automation`. Every
 * user-defined scheduled job (`user_scheduled_jobs.row`) carries an
 * `executorType`. The registry (`executor-registry.ts`) maps that
 * type to an `IExecutor<TPayload>` instance; the dispatcher
 * (`dispatch-due-jobs.command.ts`) drives the executor through a
 * fixed two-phase contract:
 *
 *   1. `buildPayload(raw)` — pure, validating. Converts the raw
 *      `inputPayload` from the DB row into a typed payload the
 *      executor understands. Throws `ExecutorInvalidPayloadError`
 *      on schema mismatch; the row is marked `failed` and the
 *      scheduler advances.
 *
 *   2. `run(ctx)` — async side-effect: enqueues downstream BullMQ
 *      jobs (agent-run / notification / report). The executor
 *      MUST be idempotent if downstream jobs may be re-delivered.
 *      Throws `ExecutorFailedError` on infrastructure failure; the
 *      handler will retry per BullMQ's policy.
 *
 * The dispatcher also calls `run` lazily for executors that choose
 * to enqueue synchronously (see `customAgentExecutor`); the result
 * is captured in `ExecutorRunResult` so the call site can log
 * downstream job ids without coupling to BullMQ directly.
 */
import type { LoggerLike } from "@openbulls/logger";

import type { ExecutorType, JobDefinition } from "./job-definition";

/**
 * Context passed to `IExecutor.run()`. Everything the executor needs
 * is pre-resolved by the dispatcher — executors do not query the DB
 * or read env vars themselves.
 */
export interface ExecutorContext<TPayload = unknown> {
  /** Owner of the schedule. Comes from `user_scheduled_jobs.user_id`. */
  readonly userId: string;
  /** The full DB row (read-only). Includes `cron`, `timezone`, etc. */
  readonly jobDefinition: JobDefinition;
  /**
   * Executor-specific, already-validated payload. The shape is
   * decided by `buildPayload()`; executors can freely narrow.
   */
  readonly payload: TPayload;
  /** Frozen timestamp at the start of the run. Use this — never `Date.now()`. */
  readonly now: Date;
  /** Logger scoped to the execution (`executionId`, `jobDefinitionId`). */
  readonly logger: LoggerLike;
}

/**
 * Discriminated union describing what kind of downstream side-effect
 * the executor produced. The dispatcher uses it purely for logging
 * and for the `scheduled_job_executions.status` final transition:
 *   - `"agent-run"`     → execution row ends as `succeeded` once
 *                         the downstream `agent-run` finishes. We
 *                         do not block on it here — the agent
 *                         handler updates the row via
 *                         `markExecutionAgentRunId` / `markSucceeded`.
 *   - `"notification"`  → same as `agent-run`; the consumer (Faz 6)
 *                         will own the terminal status update.
 *   - `"report"`        → Faz 7 hook; same as above.
 *   - `"noop"`          → executor ran but had nothing to do
 *                         (e.g. price below threshold); terminal
 *                         status is `skipped` immediately.
 */
export type ExecutorRunKind = "agent-run" | "notification" | "report" | "noop";

export interface ExecutorRunResult {
  readonly kind: ExecutorRunKind;
  /**
   * BullMQ job ids the executor enqueued. Useful for tracing in
   * logs; the dispatcher stores the *first* agent-run id as
   * `agent_run_id` on the execution row when `kind === "agent-run"`.
   */
  readonly downstreamJobIds: readonly string[];
  /** Optional human note (e.g. "no symbols crossed the threshold"). */
  readonly notes?: string;
}

/**
 * Executor port — every executor in the registry implements this.
 *
 * Type parameter `TPayload` is the post-`buildPayload` shape. The
 * default (`unknown`) is used by the registry contract because executors
 * are stored untyped in the registry map; the dispatcher hands the
 * payload as-is to `run(ctx)` and each executor narrows internally.
 */
export interface IExecutor<TPayload = unknown> {
  /** Same literal used as the registry key. Must match. */
  readonly type: ExecutorType;
  /**
   * Pure, validating. Reads the raw DB payload and returns the typed
   * view the executor needs. MUST throw `ExecutorInvalidPayloadError`
   * when the payload is malformed — do not return `Result`; throwing
   * keeps the dispatcher symmetric with `run()`.
   */
  buildPayload(raw: Readonly<Record<string, unknown>>): TPayload;
  /**
   * Async side-effect: enqueue downstream BullMQ jobs via the
   * `JobsServices` injected at construction. MUST be idempotent if
   * downstream jobs may be re-delivered. Throws on infrastructure
   * failures; the handler converts those to BullMQ retries.
   */
  run(ctx: ExecutorContext<TPayload>): Promise<ExecutorRunResult>;
}
