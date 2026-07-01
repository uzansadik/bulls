import type { JobError } from "@openbulls/jobs";
/**
 * @openbulls/agent-runtime — jobs gateway port.
 *
 * The runtime occasionally needs to enqueue follow-up work (e.g.
 * scheduling a re-run after a paused agent) via `packages/jobs`.
 * Rather than depend on BullMQ directly, the runtime talks to this
 * narrow port — tests swap it for an in-memory spy.
 */
import type { Result } from "@openbulls/shared";

/** Minimum subset of the `AgentRunJob` payload we accept. */
export interface EnqueueAgentRunInput {
  readonly userId: string;
  readonly graphKey: string;
  readonly threadId: string;
  readonly input: unknown;
  /** Optional reservation id, threaded through billing guards. */
  readonly reservationId?: string;
}

export interface EnqueueAgentRunResult {
  readonly jobId: string;
}

export interface IJobsGateway {
  enqueueAgentRun(input: EnqueueAgentRunInput): Promise<Result<EnqueueAgentRunResult, JobError>>;
}
