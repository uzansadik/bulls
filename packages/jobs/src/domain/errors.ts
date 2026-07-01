/**
 * @openbulls/jobs — domain error taxonomy.
 *
 * Four error families cover every failure mode the queue layer surfaces to
 * the application layer:
 *
 *  - QueueUnavailable  — Redis connection lost or BullMQ worker not running.
 *  - JobNotFound       — consumer was handed a job id that doesn't exist
 *                        (e.g. after a TTL expire or manual purge).
 *  - PayloadInvalid    — payload failed Zod validation at enqueue or dequeue.
 *  - BackpressureExceeded — rate limiter rejected the enqueue.
 *
 * Each extends `AppError` so callers can pattern-match on `err.code` and
 * decide whether to retry, surface, or escalate.
 */
import { AppError } from "@openbulls/shared";

/**
 * Raised when the queue backing store (Redis) is unreachable, the queue
 * name is invalid, or the producer/consumer was not initialised.
 */
export class QueueUnavailableError extends AppError {
  readonly code = "jobs/queue-unavailable" as const;

  constructor(
    message: string,
    readonly data: { readonly queueName?: string; readonly cause?: string } = {},
  ) {
    super(message);
  }
}

/**
 * Raised when a BullMQ `jobId` lookup fails. Usually indicates a TTL
 * expiry, manual purge, or that the worker is processing stale state.
 */
export class JobNotFoundError extends AppError {
  readonly code = "jobs/job-not-found" as const;

  constructor(
    message: string,
    readonly data: { readonly jobId: string; readonly queueName?: string },
  ) {
    super(message);
  }
}

/**
 * Raised when a job payload fails schema validation. The `field` and
 * `issue` properties let callers locate which input was malformed.
 */
export class PayloadInvalidError extends AppError {
  readonly code = "jobs/payload-invalid" as const;

  constructor(
    message: string,
    readonly data: {
      readonly jobKind: string;
      readonly field?: string;
      readonly issue?: string;
    },
  ) {
    super(message);
  }
}

/**
 * Raised when the per-minute rate limit is exceeded. The producer should
 * back off (delay + retry) or surface to the caller.
 */
export class BackpressureExceededError extends AppError {
  readonly code = "jobs/backpressure-exceeded" as const;

  constructor(
    message: string,
    readonly data: { readonly queueName: string; readonly limitPerMin: number },
  ) {
    super(message);
  }
}

/** Convenience union for `Result<T, JobError>`. */
export type JobError =
  | QueueUnavailableError
  | JobNotFoundError
  | PayloadInvalidError
  | BackpressureExceededError;
