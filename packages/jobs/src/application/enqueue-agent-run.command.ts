/**
 * @openbulls/jobs — application: `enqueueAgentRun`.
 *
 * Wraps `producer.enqueue` with input validation. Returns the assigned
 * `jobId` on success or a structured `JobError` on failure.
 *
 * Validation rules:
 *   - `userId`, `graphKey`, `threadId` must be non-empty strings
 *   - `input` must be a plain object (not null, not array)
 *   - `reservationId` (if provided) must be a string
 */
import { type Result, err, ok } from "@openbulls/shared";

import { GraphKey, ThreadId } from "../domain/brands";
import { type JobError, PayloadInvalidError } from "../domain/errors";
import type { AgentRunJob } from "../domain/job-type";
import type { IJobProducer } from "../domain/ports/queue.port";
import type { LoggerLike } from "../infrastructure/log";
import { noopLogger } from "../infrastructure/log";

export interface EnqueueAgentRunDeps {
  readonly producer: IJobProducer;
  readonly logger?: LoggerLike;
}

export interface EnqueueAgentRunInput {
  readonly userId: string;
  readonly graphKey: string;
  readonly threadId: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly reservationId?: string;
}

export async function enqueueAgentRun(
  deps: EnqueueAgentRunDeps,
  input: EnqueueAgentRunInput,
): Promise<Result<{ readonly jobId: string }, JobError>> {
  const logger = deps.logger ?? noopLogger;

  if (!input.userId || input.userId.length === 0) {
    return err(
      new PayloadInvalidError("userId must be a non-empty string", {
        jobKind: "agent-run",
        field: "userId",
        issue: "empty",
      }),
    );
  }
  if (!input.graphKey || input.graphKey.length === 0) {
    return err(
      new PayloadInvalidError("graphKey must be a non-empty string", {
        jobKind: "agent-run",
        field: "graphKey",
        issue: "empty",
      }),
    );
  }
  if (!input.threadId || input.threadId.length === 0) {
    return err(
      new PayloadInvalidError("threadId must be a non-empty string", {
        jobKind: "agent-run",
        field: "threadId",
        issue: "empty",
      }),
    );
  }
  if (!input.input || typeof input.input !== "object" || Array.isArray(input.input)) {
    return err(
      new PayloadInvalidError("input must be a plain object", {
        jobKind: "agent-run",
        field: "input",
        issue: "not-object",
      }),
    );
  }

  // Build the envelope. jobId / enqueuedAt are stamped by the producer.
  const envelope: Omit<AgentRunJob, "jobId" | "enqueuedAt"> = {
    kind: "agent-run",
    userId: input.userId,
    graphKey: GraphKey(input.graphKey),
    threadId: ThreadId(input.threadId),
    input: input.input,
    ...(input.reservationId !== undefined ? { reservationId: input.reservationId } : {}),
  };

  logger.debug("enqueueAgentRun", {
    userId: input.userId,
    graphKey: input.graphKey,
    threadId: input.threadId,
  });

  const result = await deps.producer.enqueue(envelope);
  if (!result.ok) return result;

  // JobId stringification: the producer may return branded JobId or raw
  // UUID — both are acceptable as `string` here.
  return ok({ jobId: result.value.jobId });
}
