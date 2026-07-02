/**
 * @openbulls/jobs — job payload discriminated union.
 *
 * Each variant maps 1:1 to a `packages/automation` executor or a
 * `packages/agent-runtime` graph. New job kinds add a new variant here
 * AND a new `enqueue*` command in `application/`.
 *
 * Discriminator: `kind` (kebab-case string). Consumers pattern-match
 * on it; the rest of the payload is type-narrowed automatically.
 *
 * Skeleton variants (`notification-dispatch`, `report-render`,
 * `scheduled-job-dispatch`) are wired today with placeholder payloads
 * but their executors are stubs until Faz 5-7 land.
 */
import type { GraphKey, JobId, ThreadId } from "./brands";

/** Agent runtime run — consumed by `apps/agent-worker`. */
export interface AgentRunJob {
  readonly kind: "agent-run";
  readonly jobId: JobId;
  readonly userId: string;
  readonly graphKey: GraphKey;
  readonly threadId: ThreadId;
  /** Graph-specific input (passed to the subgraph's `buildState`). */
  readonly input: Readonly<Record<string, unknown>>;
  /** Optional credit reservation id linked to this run. */
  readonly reservationId?: string;
  readonly enqueuedAt: string;
}

/** Scheduled job dispatch — consumed by `packages/automation`. */
export interface ScheduledJobDispatchJob {
  readonly kind: "scheduled-job-dispatch";
  readonly jobId: JobId;
  readonly executionId: string;
  readonly userId: string;
  readonly jobDefinitionKey: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly enqueuedAt: string;
}

/** Notification dispatch — skeleton for Faz 6 (Telegram / email / web). */
export interface NotificationDispatchJob {
  readonly kind: "notification-dispatch";
  readonly jobId: JobId;
  readonly userId: string;
  readonly notificationKind: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly enqueuedAt: string;
}

/** Report render — skeleton for Faz 7 (PDF / Excel). */
export interface ReportRenderJob {
  readonly kind: "report-render";
  readonly jobId: JobId;
  readonly userId: string;
  readonly reportType: string;
  readonly format: "pdf" | "excel" | "markdown";
  readonly payload: Readonly<Record<string, unknown>>;
  readonly enqueuedAt: string;
}

/** Discriminated union of every job kind this package can produce. */
export type Job = AgentRunJob | ScheduledJobDispatchJob | NotificationDispatchJob | ReportRenderJob;

/** Compile-time list of supported job kinds (used for tests + iteration). */
export type JobKind = Job["kind"];

/** Helper: extract a variant's payload type by kind. */
export type JobOf<K extends JobKind> = Extract<Job, { readonly kind: K }>;

/** Helper: extract a variant's payload type by kind — without `kind`. */
export type JobInput<K extends JobKind> = Omit<JobOf<K>, "kind" | "jobId" | "enqueuedAt">;
