/**
 * apps/agent-worker — jobs gateway adapter.
 *
 * Thin pass-through from `@openbulls/agent-runtime`'s
 * `IJobsGateway.enqueueAgentRun` port to `@openbulls/jobs`'s
 * `JobsServices.enqueueAgentRun` use case.
 *
 * Field mapping:
 *   - gateway `input: unknown` → jobs `input: Record<string, unknown>`
 *     The agent-runtime rarely needs to re-enqueue from inside a
 *     subgraph, but when it does (e.g. resume after a pause), the
 *     payload is the graph's input record.
 *   - `reservationId` is optional on both sides.
 */
import type {
  EnqueueAgentRunInput,
  EnqueueAgentRunResult,
  IJobsGateway,
} from "@openbulls/agent-runtime";
import type { JobError, JobsServices } from "@openbulls/jobs";
import { type Result, err, ok } from "@openbulls/shared";

export function createJobsAdapter(services: JobsServices): IJobsGateway {
  return {
    async enqueueAgentRun(
      input: EnqueueAgentRunInput,
    ): Promise<Result<EnqueueAgentRunResult, JobError>> {
      const jobsInput: Parameters<JobsServices["enqueueAgentRun"]>[0] = {
        userId: input.userId,
        graphKey: input.graphKey as never,
        threadId: input.threadId,
        input: (input.input ?? {}) as Record<string, unknown>,
        ...(input.reservationId ? { reservationId: input.reservationId } : {}),
      };
      const result = await services.enqueueAgentRun(jobsInput);
      if (!result.ok) {
        return err(result.error);
      }
      return ok({ jobId: result.value.jobId });
    },
  };
}
