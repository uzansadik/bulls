/**
 * @openbulls/automation — application-layer dependency + service types.
 *
 * `AutomationDeps` is the constructor input for `createAutomationServices`.
 * Each use case takes its own subset; everything is optional and a
 * sensible default is provided (noopLogger, `now = () => new Date()`,
 * `uuid = randomUUID`).
 *
 * `AutomationServices` is the full surface returned by the factory.
 * Consumers (`apps/cron`, `apps/agent-worker`) always receive a
 * fully-bound object; instantiating adapters by hand is reserved
 * for tests.
 */
import type { LoggerLike } from "@openbulls/logger";

import type { IMarketDataGateway } from "@openbulls/agent-runtime";
import type { DatabaseOrTx } from "@openbulls/db/client";
import type { JobsServices } from "@openbulls/jobs";

import type {
  IScheduledJobExecutionRepository,
  IUserScheduledJobRepository,
} from "../infrastructure/repositories/ports";
import type { IExecutorRegistry } from "./executor-registry";
import type { FindDueJobsResult } from "./find-due-jobs.query";

export interface AutomationDeps {
  /** Either the singleton db or a transaction-scoped client. */
  readonly db: DatabaseOrTx;
  /** Job envelope producer — already wired by `createJobsServicesFromEnv`. */
  readonly jobs: JobsServices;
  /**
   * Market data gateway used by the `price_alert` executor. Optional
   * because the registry can be composed without it (only the four
   * executors that don't read quotes will work).
   */
  readonly marketData?: IMarketDataGateway;
  /** Optional pre-seeded registry; advanced callers may pass their own. */
  readonly registry?: IExecutorRegistry;
  readonly userScheduledJobRepo?: IUserScheduledJobRepository;
  readonly scheduledJobExecutionRepo?: IScheduledJobExecutionRepository;
  readonly logger?: LoggerLike;
  /** Override for test clocks. */
  readonly now?: () => Date;
  /** UUID generator — defaults to `crypto.randomUUID`. */
  readonly uuid?: () => string;
}

export interface AutomationServices {
  readonly registry: IExecutorRegistry;
  readonly userScheduledJobRepo: IUserScheduledJobRepository;
  readonly scheduledJobExecutionRepo: IScheduledJobExecutionRepository;
  /**
   * Pulls the set of due jobs. Read-only; safe to call multiple
   * times per tick (the dispatcher only calls it once).
   */
  readonly findDueJobs: (input?: { readonly batchSize?: number }) => Promise<FindDueJobsResult>;
  /**
   * Runs one full dispatch cycle: pulls due jobs, enqueues them,
   * advances `nextRunAt`. Idempotent across ticks thanks to the
   * `nextRunAt` gate; safe to invoke multiple times.
   */
  readonly dispatchDueJobs: (input?: { readonly batchSize?: number }) => Promise<DispatchSummary>;
  /**
   * Updates an execution row's status. Used by the
   * `scheduled-job-dispatch` handler.
   */
  readonly markExecutionResult: (input: MarkExecutionResultInput) => Promise<void>;
  /**
   * Attaches an `ai_agent_runs.id` to an execution row, so the
   * execution → agent-run link survives even if the agent run
   * finishes asynchronously.
   */
  readonly attachAgentRunToExecution: (input: AttachAgentRunInput) => Promise<void>;
  /** Ops: dump registered executors as a JSON-friendly array. */
  readonly listExecutors: () => readonly ExecutorDescriptor[];
}

// ── DTOs ──────────────────────────────────────────────────────────────────

/**
 * Result of a single `dispatchDueJobs` invocation. The cron process
 * logs this; the web admin tool (Faz 8) uses it to render a
 * per-tick dashboard.
 */
export interface DispatchSummary {
  readonly found: number;
  readonly dispatched: number;
  readonly skipped: number;
  readonly failed: number;
  readonly durationMs: number;
}

/**
 * Allowed execution status transitions. Mirrors `executionStatusEnum`
 * (`queued | running | succeeded | failed | skipped`).
 */
export type ExecutionStatusTransition = "running" | "succeeded" | "failed" | "skipped";

export interface MarkExecutionResultInput {
  readonly executionId: string;
  readonly status: ExecutionStatusTransition;
  /** Required when `status === "failed"` or `"skipped"`. */
  readonly reason?: string;
}

export interface AttachAgentRunInput {
  readonly executionId: string;
  readonly agentRunId: string;
}

/** Lightweight, JSON-serializable view of a registered executor. */
export interface ExecutorDescriptor {
  readonly type: string;
}
