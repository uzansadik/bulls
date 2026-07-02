/**
 * @openbulls/jobs — application: `enqueueScheduledJobDispatch`.
 *
 * Bridges `packages/automation`'s `custom_agent` (and other) executors
 * with the BullMQ worker. Used by `apps/cron`'s dispatcher after
 * `findDueJobs` returns due executions.
 *
 * Validation mirrors `enqueueAgentRun`: non-empty identifiers and a
 * plain-object payload.
 */
import { type Result, err, ok } from "@openbulls/shared";

import { type JobError, PayloadInvalidError } from "../domain/errors";
import type { ScheduledJobDispatchJob } from "../domain/job-type";
import type { IJobProducer } from "../domain/ports/queue.port";
import type { LoggerLike } from "../infrastructure/log";
import { noopLogger } from "../infrastructure/log";

export interface EnqueueScheduledJobDispatchDeps {
  readonly producer: IJobProducer;
  readonly logger?: LoggerLike;
}

export interface EnqueueScheduledJobDispatchInput {
  readonly executionId: string;
  readonly userId: string;
  readonly jobDefinitionKey: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export async function enqueueScheduledJobDispatch(
  deps: EnqueueScheduledJobDispatchDeps,
  input: EnqueueScheduledJobDispatchInput,
): Promise<Result<{ readonly jobId: string }, JobError>> {
  const logger = deps.logger ?? noopLogger;

  if (!input.executionId) {
    return err(
      new PayloadInvalidError("executionId is required", {
        jobKind: "scheduled-job-dispatch",
        field: "executionId",
        issue: "empty",
      }),
    );
  }
  if (!input.userId) {
    return err(
      new PayloadInvalidError("userId is required", {
        jobKind: "scheduled-job-dispatch",
        field: "userId",
        issue: "empty",
      }),
    );
  }
  if (!input.jobDefinitionKey) {
    return err(
      new PayloadInvalidError("jobDefinitionKey is required", {
        jobKind: "scheduled-job-dispatch",
        field: "jobDefinitionKey",
        issue: "empty",
      }),
    );
  }

  const envelope: Omit<ScheduledJobDispatchJob, "jobId" | "enqueuedAt"> = {
    kind: "scheduled-job-dispatch",
    executionId: input.executionId,
    userId: input.userId,
    jobDefinitionKey: input.jobDefinitionKey,
    payload: input.payload,
  };

  logger.debug("enqueueScheduledJobDispatch", {
    executionId: input.executionId,
    jobDefinitionKey: input.jobDefinitionKey,
  });

  const result = await deps.producer.enqueue(envelope);
  if (!result.ok) return result;
  return ok({ jobId: result.value.jobId });
}
