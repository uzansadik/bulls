/**
 * @openbulls/jobs — queue port interfaces.
 *
 * The producer side (`IJobProducer`) writes jobs to the queue. The
 * consumer side (`IJobConsumer`) registers handlers and dispatches each
 * dequeued job to its handler.
 *
 * Both are intentionally technology-agnostic — the BullMQ implementation
 * lives in `infrastructure/bullmq-*.ts`. Tests use the in-memory mock
 * from `__tests__/in-memory-queue.mock.ts`.
 *
 * Handler contract:
 *   - Handlers MUST be idempotent: the same `jobId` may be redelivered
 *     after a worker crash (BullMQ retries by default).
 *   - Handlers SHOULD resolve quickly. Long work is the worker's job;
 *     the handler just dispatches to the appropriate service.
 *   - Returning normally marks the job succeeded; throwing marks it
 *     failed and triggers BullMQ's retry policy.
 */
import type { Result } from "@openbulls/shared";
import type { JobError } from "../errors";
import type { Job, JobKind, JobOf } from "../job-type";

/**
 * Producer — pushes jobs onto the queue.
 *
 * Implementations should validate the payload at the boundary and
 * surface `PayloadInvalidError` instead of writing bad data.
 */
export interface IJobProducer {
  /** Enqueue a single job; returns the assigned `JobId`. */
  enqueue<K extends JobKind>(
    job: JobOfPayload<K>,
  ): Promise<Result<{ readonly jobId: string }, JobError>>;

  /** Enqueue multiple jobs in one round-trip; per-job errors are surfaced individually. */
  enqueueMany<K extends JobKind>(
    jobs: readonly JobOfPayload<K>[],
  ): Promise<Result<readonly { readonly jobId: string }[], JobError>>;

  /** Flush + close producer resources (Redis pools etc.). */
  close(): Promise<void>;
}

/**
 * Consumer — registers handlers and starts the worker loop.
 *
 * One consumer owns one queue name and one concurrency. To scale,
 * run multiple processes against the same queue.
 */
export interface IJobConsumer {
  /**
   * Register a handler for a given job kind. Calling `process` multiple
   * times for the same kind replaces the previous handler.
   */
  process<K extends JobKind>(kind: K, handler: (job: JobOf<K>) => Promise<void>): Promise<void>;

  /** Start consuming (idempotent). */
  start(): Promise<void>;

  /** Pause the consumer; jobs already in flight complete. */
  pause(): Promise<void>;

  /** Stop accepting new jobs and drain in-flight ones. */
  stop(): Promise<void>;
}

// ── Internal helpers ────────────────────────────────────────────────────────
//
// The producer takes a payload without `jobId` / `enqueuedAt`; the
// implementation stamps those on insertion. Discriminate-by-kind is
// preserved so the producer can route on `kind`.

export type JobOfPayload<K extends JobKind> = {
  readonly kind: K;
} & Omit<Extract<Job, { readonly kind: K }>, "kind" | "jobId" | "enqueuedAt">;

/** Shape returned to handlers after dequeue (always fully-typed). */
export type EnvelopedJob<K extends JobKind = JobKind> = Extract<Job, { readonly kind: K }>;
