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
import type { AgentRunState } from "../domain/state";

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
 * Generic `S` is the subgraph's typed state (extends AgentRunState).
 * `U` is the update type — usually left as `unknown` because the
 * LangGraph reducer chain determines the precise shape. The factory
 * may pick any annotation it wants, as long as it is a superset of
 * `AgentRunStateAnnotation`.
 */
export type CompiledGraphFactory<
  S extends AgentRunState = AgentRunState,
  U = unknown,
> = (deps: CompiledGraphDeps) => CompiledStateGraph<S, U>;