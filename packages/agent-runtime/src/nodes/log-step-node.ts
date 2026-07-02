/**
 * @openbulls/agent-runtime — log-step node factory.
 *
 * Records a `ai_agent_run_steps` row for the current graph step.
 * Designed as an idempotent passthrough: every node in a graph can be
 * wrapped with `logStep(...)` so the audit trail is complete without
 * requiring each node to write its own bookkeeping.
 *
 * The factory returns a LangGraph-compatible `(state, deps) => state`
 * function — the runtime wraps it via `withDeps` and feeds the
 * result to `StateGraph.addNode(name, fn)`.
 */
import type { NodeDeps } from "../domain/langgraph-node";
import type { AgentRunState } from "../domain/state";

export interface LogStepNodeOptions {
  /** Persisted on the step row as `node_key`. */
  readonly stepKey: string;
}

export function logStep(options: LogStepNodeOptions) {
  const { stepKey } = options;
  return {
    async run(state: AgentRunState, deps: NodeDeps): Promise<Partial<AgentRunState>> {
      const repo = deps.agentRuns;
      if (!repo) {
        deps.logger.warn("log-step skipped — agentRuns dep missing", {
          runId: state.runId,
          stepKey,
        });
        return {};
      }
      const startedAt = new Date(deps.now());
      const step = await repo.recordStep({
        runId: state.runId,
        nodeKey: stepKey,
        status: "started",
        startedAt,
      });
      deps.logger.info("step started", {
        runId: state.runId,
        stepKey,
        stepId: step.id,
      });
      return {};
    },
  };
}