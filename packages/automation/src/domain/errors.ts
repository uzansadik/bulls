/**
 * @openbulls/automation — domain error taxonomy.
 *
 * Mirrors the conventions used by `@openbulls/jobs` (each extends
 * `AppError`, has a stable `code` literal, and lives inside a
 * discriminated union for `Result<T, AutomationError>`).
 *
 * Surface rules:
 *   - `ExecutorNotFoundError`         → unknown executor type in user DB row
 *   - `ExecutorInvalidPayloadError`   → input_payload fails executor validation
 *   - `ExecutorFailedError`           → executor.run threw; advanced already
 *   - `InvalidCronExpressionError`    → cron string failed to parse
 *   - `InvalidTimezoneError`          → IANA TZ failed validation
 *   - `ExecutorAlreadyRegisteredError` → double-register attempt
 */
import { AppError } from "@openbulls/shared";

/**
 * Raised by `IExecutorRegistry.get()` when the registry has no executor
 * for the requested type. `apps/cron`'s dispatcher converts this into
 * a `scheduled_job_executions` row in `skipped` status — it never
 * throws out to BullMQ because the only way to surface it would be
 * to retry a job we *know* we cannot run.
 */
export class ExecutorNotFoundError extends AppError {
  readonly code = "automation/executor-not-found" as const;

  constructor(
    message: string,
    readonly data: { readonly executorType: string; readonly jobDefinitionKey: string },
  ) {
    super(message);
  }
}

/**
 * Raised by `IExecutor.buildPayload()` when the `inputPayload` from a
 * `user_scheduled_jobs` row fails the executor's schema. Treated
 * identically to `ExecutorNotFoundError` from the dispatcher's
 * perspective: the row is marked `failed`, `next_run_at` is advanced,
 * the next tick will not retry the same broken payload.
 */
export class ExecutorInvalidPayloadError extends AppError {
  readonly code = "automation/executor-invalid-payload" as const;

  constructor(
    message: string,
    readonly data: {
      readonly executorType: string;
      readonly jobDefinitionKey: string;
      readonly reason: string;
    },
  ) {
    super(message);
  }
}

/**
 * Raised by `IExecutor.run()` itself. Carries the underlying cause so
 * the dispatch log keeps enough context to diagnose.
 */
export class ExecutorFailedError extends AppError {
  readonly code = "automation/executor-failed" as const;

  constructor(
    message: string,
    readonly data: {
      readonly executorType: string;
      readonly executionId: string;
      readonly jobDefinitionKey: string;
      readonly cause?: string;
    },
  ) {
    super(message);
  }
}

/**
 * Raised by `schedule.ts` when a cron expression fails to parse.
 * Validation should run at the boundary (DB write + dispatch time);
 * catching this here keeps "schedule corrupted in DB" diagnosable.
 */
export class InvalidCronExpressionError extends AppError {
  readonly code = "automation/invalid-cron-expression" as const;

  constructor(
    message: string,
    readonly data: { readonly expression: string },
  ) {
    super(message);
  }
}

/**
 * Raised by `schedule.ts` when an IANA timezone identifier is not
 * recognized by the host's tz database.
 */
export class InvalidTimezoneError extends AppError {
  readonly code = "automation/invalid-timezone" as const;

  constructor(
    message: string,
    readonly data: { readonly timezone: string },
  ) {
    super(message);
  }
}

/**
 * Raised by `IExecutorRegistry.register()` when an executor for the
 * given type has already been registered. The default registry is
 * immutable; advanced callers can compose a new registry to swap
 * implementations per-environment (Faz 8+).
 */
export class ExecutorAlreadyRegisteredError extends AppError {
  readonly code = "automation/executor-already-registered" as const;

  constructor(
    message: string,
    readonly data: { readonly executorType: string },
  ) {
    super(message);
  }
}

/** Convenience union used everywhere this package returns `Result<T, E>`. */
export type AutomationError =
  | ExecutorNotFoundError
  | ExecutorInvalidPayloadError
  | ExecutorFailedError
  | InvalidCronExpressionError
  | InvalidTimezoneError
  | ExecutorAlreadyRegisteredError;
