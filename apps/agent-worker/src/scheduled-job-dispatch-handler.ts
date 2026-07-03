/**
 * apps/agent-worker — `scheduled-job-dispatch` job handler.
 *
 * Bridges BullMQ-dequeued `scheduled-job-dispatch` jobs to the
 * `@openbulls/automation` executor pattern. Each job runs the
 * executor's `buildPayload` (already done by the dispatcher — see
 * PLAN §5.2) and `run` in this process. The handler:
 *
 *   1. Resolves the `ScheduledJobExecution` + `UserScheduledJob`.
 *   2. Marks the execution row `running` with the BullMQ `jobId`.
 *   3. Looks up the executor from the registry (throws if unknown —
 *      BullMQ retries).
 *   4. Calls `executor.run({ userId, jobDefinition, payload, now, logger })`.
 *   5. Finalizes the execution row (`succeeded` / `skipped`).
 *   6. Attaches the downstream `agent_run_id` when the executor
 *      enqueued an agent-run job (Faz 6+ will extend this for
 *      notification + report kinds).
 *
 * Idempotency: the execution row's status guards in
 * `DrizzleScheduledJobExecutionRepository` prevent double-marking.
 * A redelivered BullMQ job will short-circuit when the row is
 * already `succeeded`.
 */
import type { LoggerLike } from "@openbulls/agent-runtime";
import type { ScheduledJobDispatchJob } from "@openbulls/jobs";

import type {
  AutomationServices,
  IScheduledJobExecutionRepository,
  IUserScheduledJobRepository,
} from "@openbulls/automation";

export interface ScheduledJobDispatchHandlerDeps {
  readonly automation: AutomationServices;
  readonly userScheduledJobRepo: IUserScheduledJobRepository;
  readonly scheduledJobExecutionRepo: IScheduledJobExecutionRepository;
  readonly logger: LoggerLike;
  readonly now: () => Date;
}

/**
 * Returns a handler suitable for `consumer.process("scheduled-job-dispatch", …)`.
 * Pure factory — no global state, safe to test.
 */
export function makeScheduledJobDispatchHandler(
  deps: ScheduledJobDispatchHandlerDeps,
): (job: ScheduledJobDispatchJob) => Promise<void> {
  return async (job: ScheduledJobDispatchJob): Promise<void> => {
    const log = {
      jobId: job.jobId,
      executionId: job.executionId,
      userId: job.userId,
      jobDefinitionKey: job.jobDefinitionKey,
    };

    // 1. Resolve the execution row.
    const execution = await deps.scheduledJobExecutionRepo.getById(job.executionId);
    if (!execution) {
      deps.logger.warn("scheduled-job-dispatch: execution row missing", log);
      // Nothing to mark; we still throw so BullMQ retries — the
      // dispatcher is the authoritative writer and may not have
      // committed yet (network blip between apps).
      throw new Error(`execution row missing: ${job.executionId}`);
    }

    // 2. Idempotency: already terminal? Skip silently.
    if (
      execution.status === "succeeded" ||
      execution.status === "skipped" ||
      execution.status === "failed"
    ) {
      deps.logger.info("scheduled-job-dispatch: already terminal, skipping", {
        ...log,
        status: execution.status,
      });
      return;
    }

    // 3. Resolve the job definition.
    const jobDefinition = await deps.userScheduledJobRepo.getById(job.jobDefinitionKey);
    if (!jobDefinition) {
      deps.logger.error("scheduled-job-dispatch: job definition missing", log);
      await deps.scheduledJobExecutionRepo.markFailed(job.executionId, "job_definition_not_found");
      throw new Error(`job definition missing: ${job.jobDefinitionKey}`);
    }

    // 4. Mark running + capture the BullMQ jobId on the row.
    await deps.scheduledJobExecutionRepo.markRunning(job.executionId, job.jobId);

    // 5. Look up the executor. Unknown type is a permanent failure
    //    (the dispatcher would have caught this — but if the row
    //    made it past the dispatcher somehow, surface it).
    const executor = deps.automation.registry.get(jobDefinition.executorType);
    if (!executor) {
      const message = `executor_not_registered: ${jobDefinition.executorType}`;
      deps.logger.warn("scheduled-job-dispatch: unknown executor", log);
      await deps.scheduledJobExecutionRepo.markSkipped(job.executionId, message);
      // Do not throw — BullMQ should not retry a permanent skip.
      return;
    }

    // 6. Build the payload. The dispatcher already validated it,
    //    but a DB row mutation between dispatch and consume could
    //    in theory invalidate the schema; re-validate here.
    let payload: unknown;
    try {
      payload = executor.buildPayload(
        (jobDefinition.inputPayload ?? {}) as Readonly<Record<string, unknown>>,
      );
    } catch (err) {
      const reason = err instanceof Error ? err.message : "unspecified";
      deps.logger.error("scheduled-job-dispatch: buildPayload failed", {
        ...log,
        err: reason,
      });
      await deps.scheduledJobExecutionRepo.markFailed(job.executionId, reason);
      // Permanent failure — do not throw.
      return;
    }

    // 7. Run the executor.
    try {
      const result = await executor.run({
        userId: jobDefinition.userId,
        jobDefinition,
        payload,
        now: deps.now(),
        logger: deps.logger,
      });

      // Attach agent_run_id when the executor enqueued an agent-run.
      // The downstream enqueue returns the BullMQ jobId; we can't
      // resolve that to an `agent_run_id` here (the agent worker
      // creates the row), so we leave the attachment for a future
      // job-state lookup. Faz 6+: a separate observability worker
      // back-fills this from BullMQ job metadata.

      if (result.kind === "noop") {
        await deps.scheduledJobExecutionRepo.markSkipped(job.executionId, result.notes ?? "noop");
        deps.logger.info("scheduled-job-dispatch: skipped (noop)", {
          ...log,
          notes: result.notes,
        });
        return;
      }

      await deps.scheduledJobExecutionRepo.markSucceeded(job.executionId);
      deps.logger.info("scheduled-job-dispatch: succeeded", {
        ...log,
        resultKind: result.kind,
        downstreamJobIds: result.downstreamJobIds,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "unspecified";
      deps.logger.error("scheduled-job-dispatch: executor.run threw", {
        ...log,
        err: reason,
      });
      await deps.scheduledJobExecutionRepo.markFailed(job.executionId, reason);
      // Re-throw so BullMQ's retry policy engages. The dispatcher
      // already advanced `next_run_at`, so the next tick will pick
      // up the *next* scheduled occurrence, not this one.
      throw err;
    }
  };
}
