/**
 * @openbulls/agent-runtime — composition root.
 *
 * Wires concrete adapters (Drizzle saver, billing/market/portfolio
 * gateways, jobs producer) onto the abstract ports and returns a
 * single `AgentRuntimeServices` surface. Tests call
 * `createAgentRuntimeServices` with their own mocks; production calls
 * `createAgentRuntimeServicesFromEnv`.
 */
import { GraphRegistry } from "../domain/graph";
import type { AgentRuntimeDeps, AgentRuntimeServices } from "./agent-runtime.types";
import { DrizzleCheckpointerSaver } from "./checkpointer.saver";
import { pauseRun, resumeRun, runGraph } from "./run-graph";

/**
 * Low-level factory — accepts already-wired concrete adapters. Use
 * this from tests and from the env-bound factory below.
 */
export function createAgentRuntimeServices(deps: AgentRuntimeDeps): AgentRuntimeServices {
  return {
    graphRegistry: deps.graphRegistry,
    runGraph: (input) => runGraph(deps, input),
    pauseRun: (input) => pauseRun(deps, input),
    resumeRun: (input) => resumeRun(deps, input),
  };
}

/**
 * Env-bound factory — used by `apps/agent-worker`. The checkpointer
 * is instantiated here against the agent-run repository; the registry
 * starts empty (call `registerDefaultGraphs` on the returned services).
 */
export interface CreateAgentRuntimeServicesFromEnvDeps {
  readonly graphRegistry?: GraphRegistry;
  readonly deps: Omit<AgentRuntimeDeps, "graphRegistry" | "checkpointer"> & {
    readonly agentRuns: AgentRuntimeDeps["agentRuns"];
  };
}

export function createAgentRuntimeServicesFromEnv(
  input: CreateAgentRuntimeServicesFromEnvDeps,
): AgentRuntimeServices {
  const registry = input.graphRegistry ?? new GraphRegistry();
  const checkpointer = new DrizzleCheckpointerSaver(input.deps.agentRuns);
  return createAgentRuntimeServices({
    ...input.deps,
    graphRegistry: registry,
    checkpointer,
  });
}
