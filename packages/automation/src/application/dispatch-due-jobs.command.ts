/**
 * @openbulls/automation — `dispatchDueJobs` command.
 *
 * Single tick of the cron process. Pulls due jobs, validates each
 * payload against its registered executor, enqueues a
 * `scheduled-job-dispatch` job for `apps/agent-worker`, and advances
 * `next_run_at` so the same row is not re-issued until the next
 * scheduled occurrence.
 *
 * Failure policy (intentionally aggressive — see PLAN §5.2):
 *   - Unknown executor type      → mark `skipped`, advance, log warn
 *   - `buildPayload` throws      → mark `failed`,  advance, log warn
 *   - `enqueueScheduledJobDispatch` returns err → mark `failed`, advance, log error
 *   - `computeNextRunAt` throws  → mark `failed`, **do not advance** (caller logs)
 *
 * "Advance" always means "set `next_run_at` to a future timestamp".
 * A broken executor must not pin the dispatcher in a hot retry loop.
 *
 * BullMQ's own retry policy handles transient consumer-side errors
 * (handler throws, agent-run blip); we never re-enqueue from here.
 */
import type { LoggerLike } from "@openbulls/logger";

import type { JobsServices } from "@openbulls/jobs";
import { ExecutorInvalidPayloadError, computeNextRunAt } from "../domain";
import type {
  IScheduledJobExecutionRepository,
  IUserScheduledJobRepository,
} from "../infrastructure/repositories/ports";
import type { IExecutorRegistry } from "./executor-registry";
import { findDueJobs } from "./find-due-jobs.query";
import type { AutomationServices, DispatchSummary } from "./jobs.types";

export interface DispatchDueJobsDeps {
  readonly db: Parameters<typeof findDueJobs>[0]["db"];
  readonly jobs: JobsServices;
  readonly registry: IExecutorRegistry;
  readonly userScheduledJobRepo: IUserScheduledJobRepository;
  readonly scheduledJobExecutionRepo: IScheduledJobExecutionRepository;
  readonly logger: LoggerLike;
  readonly now: () => Date;
  readonly uuid: () => string;
  /** Optional: cap on rows per tick. Default 50. */
  readonly batchSize?: number;
}

/**
 * Lower-level entry point. `AutomationServices.dispatchDueJobs` is
 * the public façade; tests use this variant with explicit deps to
 * keep the surface flat.
 */
export async function dispatchDueJobs(
  deps: DispatchDueJobsDeps,
  input: { readonly batchSize?: number } = {},
): Promise<DispatchSummary> {
  const startedAt = deps.now();
  const logger = deps.logger;
  const batchSize = input.batchSize ?? deps.batchSize ?? 50;

  const { jobs: dueJobs, now } = await findDueJobs({
    db: deps.db,
    now: deps.now,
    batchSize,
  });

  let dispatched = 0;
  let skipped = 0;
  let failed = 0;

  for (const job of dueJobs) {
    const executionId = deps.uuid();
    const baseLog = {
      executionId,
      jobDefinitionId: job.id,
      userId: job.userId,
      executorType: job.executorType,
    };

    // 1. Insert the execution row (status: queued). Always — even
    //    when the executor is unknown, the audit trail needs the row.
    let createdExecution: { id: string };
    try {
      createdExecution = await deps.scheduledJobExecutionRepo.createQueued({
        jobId: job.id,
        payload: (job.inputPayload ?? {}) as Readonly<Record<string, unknown>>,
      });
    } catch (err) {
      logger.error("dispatch: failed to create execution row", {
        ...baseLog,
        err: String(err),
      });
      failed += 1;
      // We still try to advance nextRunAt so the same job doesn't
      // re-trigger every tick on a transient DB error.
      await tryAdvance(deps, job.id, job.cron, job.timezone, now, logger);
      continue;
    }

    const log = { ...baseLog, executionId: createdExecution.id };

    // 2. Look up the executor. Missing → skip + advance.
    const executor = deps.registry.get(job.executorType);
    if (!executor) {
      logger.warn("dispatch: unknown executor", log);
      await deps.scheduledJobExecutionRepo.markSkipped(
        createdExecution.id,
        `executor_not_found: ${job.executorType}`,
      );
      skipped += 1;
      await tryAdvance(deps, job.id, job.cron, job.timezone, now, logger);
      continue;
    }

    // 3. Validate + normalize the payload.
    let payload: unknown;
    try {
      payload = executor.buildPayload(
        (job.inputPayload ?? {}) as Readonly<Record<string, unknown>>,
      );
    } catch (err) {
      const reason =
        err instanceof ExecutorInvalidPayloadError
          ? err.data.reason
          : err instanceof Error
            ? err.message
            : "unspecified";
      logger.warn("dispatch: executor.buildPayload failed", {
        ...log,
        reason,
        err: String(err),
      });
      await deps.scheduledJobExecutionRepo.markFailed(createdExecution.id, reason);
      failed += 1;
      await tryAdvance(deps, job.id, job.cron, job.timezone, now, logger);
      continue;
    }

    // 4. Enqueue the BullMQ dispatch job.
    const enqueueResult = await deps.jobs.enqueueScheduledJobDispatch({
      executionId: createdExecution.id,
      userId: job.userId,
      jobDefinitionKey: job.id,
      payload: { executorType: job.executorType, payload },
    });
    if (!enqueueResult.ok) {
      logger.error("dispatch: enqueueScheduledJobDispatch failed", {
        ...log,
        err: enqueueResult.error.message,
      });
      await deps.scheduledJobExecutionRepo.markFailed(
        createdExecution.id,
        `enqueue_failed: ${enqueueResult.error.message}`,
      );
      failed += 1;
      await tryAdvance(deps, job.id, job.cron, job.timezone, now, logger);
      continue;
    }

    // 5. Mark the execution as `running` and attach the BullMQ jobId.
    //    `jobId` is the same column the `agent-run` consumer would
    //    attach — keeps the audit trail consistent.
    await deps.scheduledJobExecutionRepo.markRunning(
      createdExecution.id,
      enqueueResult.value.jobId,
    );

    // 6. Advance nextRunAt. If the cron is malformed in the DB, the
    //    job becomes a permanent failure (we mark `failed` and do not
    //    advance) so an operator can fix it without burning the tick.
    const advanceResult = await tryAdvance(deps, job.id, job.cron, job.timezone, now, logger);
    if (advanceResult === "invalid-schedule") {
      logger.error("dispatch: invalid schedule, leaving job due", log);
      await deps.scheduledJobExecutionRepo.markFailed(createdExecution.id, "invalid_schedule");
      failed += 1;
      continue;
    }

    logger.info("dispatch: enqueued", {
      ...log,
      jobId: enqueueResult.value.jobId,
    });
    dispatched += 1;
  }

  const durationMs = deps.now().getTime() - startedAt.getTime();
  return {
    found: dueJobs.length,
    dispatched,
    skipped,
    failed,
    durationMs,
  };
}

/**
 * Best-effort `nextRunAt` advance. Returns `"advanced"` on success,
 * `"invalid-schedule"` when `computeNextRunAt` throws. Never throws
 * itself — the dispatcher must always continue to the next job.
 */
async function tryAdvance(
  deps: DispatchDueJobsDeps,
  jobId: string,
  cron: string,
  timezone: string,
  from: Date,
  logger: LoggerLike,
): Promise<"advanced" | "invalid-schedule"> {
  try {
    const next = computeNextRunAt(cron, timezone, from);
    await deps.userScheduledJobRepo.advanceNextRunAt(jobId, next);
    return "advanced";
  } catch (err) {
    logger.error("dispatch: failed to advance nextRunAt", {
      jobId,
      cron,
      timezone,
      err: String(err),
    });
    return "invalid-schedule";
  }
}

// Re-export so the barrel pulls from one place.
export type { AutomationServices, DispatchSummary };
