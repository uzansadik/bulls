/**
 * @openbulls/agent-runtime — pause-credit-insufficient node.
 *
 * Recovery terminal — when `reserve-credit` raises
 * `InsufficientCreditsError`, the worker routes here so we:
 *   1. flip the run status to `paused` (in `ai_agent_runs`)
 *   2. log the failure with structured context
 *   3. leave the existing reservation untouched (already rejected)
 *
 * The state merge returns `status: "paused"` so the runner can stop
 * dispatching further nodes; resume comes from a fresh enqueue.
 */
import { NodeExecutionFailedError } from "../domain/errors";
import type { NodeDefinition, NodeDeps } from "../domain/graph";
import type { AgentRunState } from "../domain/state";

export const pauseCreditInsufficientNode: NodeDefinition<AgentRunState> = {
  name: "pause-credit-insufficient",
  async run(state, deps: NodeDeps) {
    const repo = deps.agentRuns;
    if (!repo) {
      throw new NodeExecutionFailedError("pause-credit-insufficient", "agentRuns dep missing");
    }
    deps.logger.warn("pausing run — insufficient credits", {
      runId: state.runId,
      userId: state.userId,
    });
    await repo.updateStatus({
      id: state.runId,
      status: "paused",
      currentNodeKey: "pause-credit-insufficient",
      error: "insufficient credits",
    });
    return {
      status: "paused",
      error: "insufficient credits",
    };
  },
};
