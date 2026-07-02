/**
 * apps/agent-worker — agent-run job handler.
 *
 * Bridges BullMQ-dequeued `agent-run` jobs to the agent-runtime
 * CompiledGraphBundle. Each job is dispatched exactly once; if
 * the subgraph throws, the handler rethrows so BullMQ's retry
 * policy takes over.
 *
 * The handler does NOT touch billing directly — billing guards
 * live inside the runtime's `reserve-credit` / `finalize-usage`
 * nodes. The runtime is responsible for `paused` / `failed` status
 * transitions on the `ai_agent_runs` row.
 *
 * Identity model:
 *   - `job.jobId` is the unique BullMQ job id.
 *   - `job.jobId` doubles as the agent-run id (`ai_agent_runs.id`).
 *     Resume is keyed by `threadId` on the LangGraph checkpointer:
 *     a fresh job with the same `threadId` will continue from the
 *     last checkpoint rather than starting over.
 */
import type {
  AgentRunState,
  CompiledGraphBundle,
  LoggerLike,
} from "@openbulls/agent-runtime";
import { GraphKey, agentRunStateToAnnotation } from "@openbulls/agent-runtime";
import type { AgentRunJob } from "@openbulls/jobs";

/** Inputs the handler needs to drain a single job. */
export interface AgentRunHandlerDeps {
  readonly bundle: CompiledGraphBundle;
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
      threadId: job.threadId,
    });
    const initial: AgentRunState = {
      runId,
      threadId: job.threadId,
      userId: job.userId,
      graphKey: job.graphKey,
      status: "running",
      startedAt: new Date().toISOString(),
      messages: [],
      scratchpad: (job.input ?? {}) as Record<string, unknown>,
      toolInvocations: [],
    };
    const result = await deps.bundle.invoke(
      GraphKey(job.graphKey),
      agentRunStateToAnnotation(initial) as unknown as AgentRunState,
      { threadId: job.threadId, userId: job.userId },
    );
    deps.logger.info("agent-run: finished", {
      jobId: job.jobId,
      runId,
      status: result.status,
    });
    // `paused` is a recoverable terminal state — handler should
    // succeed so BullMQ doesn't retry. A future notification job
    // or admin tool will resume the run by re-enqueuing with the
    // same threadId (LangGraph picks up from the last checkpoint).
    // `failed` and `completed` are final; both leave the run in
    // a stable state. Throwing here would cause BullMQ to retry
    // a "failed" run, which is what we want for transient
    // infrastructure errors (DB blip, network); the runtime
    // already retries per-node above.
  };
}
