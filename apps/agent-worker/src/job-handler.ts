/**
 * apps/agent-worker — agent-run job handler.
 *
 * Bridges BullMQ-dequeued `agent-run` jobs to the agent-runtime
 * `runGraph` helper. Each job is dispatched exactly once; if the
 * subgraph throws, the handler rethrows so BullMQ's retry policy
 * takes over.
 *
 * The handler does NOT touch billing directly — billing guards
 * live inside the runtime's `reserve-credit` / `finalize-usage`
 * nodes. The runtime is responsible for `paused` / `failed` status
 * transitions on the `ai_agent_runs` row.
 *
 * Identity model:
 *   - `job.jobId` is the unique BullMQ job id.
 *   - `job.jobId` doubles as the agent-run id (`ai_agent_runs.id`).
 *     Resume-by-jobId is therefore possible: a new job enqueued
 *     with the same id is impossible in BullMQ, so resume requires
 *     a dedicated resume channel (enqueue → `apps/cron` or admin
 *     tool) which produces a NEW `jobId`. The runtime's
 *     `resumeRun` looks up the original run row by the *runId*
 *     passed in, which is `job.jobId` from the first attempt.
 */
import type { AgentRuntimeServices, LoggerLike } from "@openbulls/agent-runtime";
import type { AgentRunJob } from "@openbulls/jobs";

/** Inputs the handler needs to drain a single job. */
export interface AgentRunHandlerDeps {
  readonly services: AgentRuntimeServices;
  readonly logger: LoggerLike;
}

export function makeAgentRunHandler(
  deps: AgentRunHandlerDeps,
): (job: AgentRunJob) => Promise<void> {
  return async (job: AgentRunJob): Promise<void> => {
    const runId = job.jobId;
    deps.logger.info("agent-run: dequeued", {
      jobId: job.jobId,
      runId,
      graphKey: job.graphKey,
      userId: job.userId,
    });
    const result = await deps.services.runGraph({
      runId,
      threadId: job.threadId,
      userId: job.userId,
      graphKey: job.graphKey as never,
      input: job.input,
    });
    deps.logger.info("agent-run: finished", {
      jobId: job.jobId,
      runId,
      status: result.status,
    });
    // `paused` is a recoverable terminal state — handler should
    // succeed so BullMQ doesn't retry. A future notification job
    // or admin tool will resume the run.
    // `failed` and `completed` are final; both leave the run in
    // a stable state. Throwing here would cause BullMQ to retry
    // a "failed" run, which is what we want for transient
    // infrastructure errors (DB blip, network); the runtime
    // already retries per-node above.
  };
}
