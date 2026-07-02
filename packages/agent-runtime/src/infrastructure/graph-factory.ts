/**
 * @openbulls/agent-runtime — graph-factory types.
 *
 * A subgraph factory is a function `(deps) => CompiledStateGraph<S>`.
 * It captures the runtime deps (logger, gateways, checkpointer) once
 * and returns a fully-compiled, ready-to-invoke graph.
 *
 * Splitting the type out from `composition.ts` lets subgraph files
 * import just the type (and the runtime deps they need) without
 * pulling in the composition root.
 */
import type { BaseCheckpointSaver, CompiledStateGraph } from "@langchain/langgraph";

import type { NodeDeps } from "../domain/langgraph-node";

/**
 * Inputs every subgraph factory needs at compile time.
 *
 * `checkpointer` is mandatory — without it LangGraph cannot persist
 * state and resume is disabled. The gateways are optional because
 * not every subgraph touches every domain (e.g. market-news does
 * not need a portfolio gateway).
 */
export interface CompiledGraphDeps extends Omit<NodeDeps, "checkpointer"> {
  readonly checkpointer: BaseCheckpointSaver;
}

/**
 * Factory signature: `deps => compiled graph`.
 *
 * Generics `S` / `U` are unconstrained because LangGraph's internal
 * `StateType<Annotation.Root<...>>` is structurally identical to
 * our canonical `AgentRunState` but nominally distinct — adding
 * `extends AgentRunState` here forces a needless cast at every
 * factory call site. The factory is responsible for picking an
 * annotation that produces a state shape compatible with
 * `AgentRunState`.
 */
export type CompiledGraphFactory<S = unknown, U = unknown> = (
  deps: CompiledGraphDeps,
) => CompiledStateGraph<S, U>;