/**
 * @openbulls/agent-runtime — log-step node.
 *
 * Records a `ai_agent_run_steps` row for the current graph step.
 * Designed as an idempotent passthrough: every node in a graph can be
 * wrapped with `logStep(...)` so the audit trail is complete without
 * requiring each node to write its own bookkeeping.
 *
 * The node carries a fixed `stepKey` from the registry definition
 * (set at registration time) — the key is what lands on the row's
 * `node_key` column, not the node instance name.
 */
import type { NodeDefinition, NodeDeps } from "../domain/graph";
import type { AgentRunState } from "../domain/state";

export interface LogStepNodeOptions {
  /** Persisted on the step row as `node_key`. */
  readonly stepKey: string;
}

export function logStep(options: LogStepNodeOptions): NodeDefinition<AgentRunState> {
  const { stepKey } = options;
  return {
    name: `log-step:${stepKey}`,
    idempotent: true,
    async run(state, deps: NodeDeps) {
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
