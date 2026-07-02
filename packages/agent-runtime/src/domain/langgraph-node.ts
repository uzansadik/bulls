/**
 * @openbulls/agent-runtime — node adapter helpers.
 *
 * Bridges between the runtime's own `NodeDeps` shape (logger,
 * billing gateway, etc.) and LangGraph's `(state, config) => update`
 * node function signature.
 *
 * Subgraph factories receive the runtime deps once at compile time,
 * then wrap each node with `withDeps` so the resulting closure
 * matches LangGraph's `addNode(name, fn)` API. Tests construct the
 * factories with stub deps; production wires the real adapters via
 * `createCompiledGraphBundle`.
 */
import type { BaseCheckpointSaver } from "@langchain/langgraph";

import type { LoggerLike, NowFn } from "../infrastructure/agent-runtime.types";
import type { IAgentRunRepository } from "./ports/agent-run-repository.port";
import type { IBillingGateway } from "./ports/billing-gateway.port";
import type { IJobsGateway } from "./ports/jobs-gateway.port";
import type { IMarketDataGateway } from "./ports/market-data-gateway.port";
import type { IPortfolioGateway } from "./ports/portfolio-gateway.port";

/**
 * Per-node dependencies, captured at compile time.
 *
 * All gateway fields are optional because production wires the full
 * set while tests only provide what a particular node touches
 * (e.g. billing for `reserve-credit`, marketData for `load-company`).
 */
export interface NodeDeps {
  readonly logger: LoggerLike;
  readonly now: NowFn;
  readonly agentRuns?: IAgentRunRepository;
  readonly billing?: IBillingGateway;
  readonly marketData?: IMarketDataGateway;
  readonly portfolio?: IPortfolioGateway;
  readonly jobs?: IJobsGateway;
  /** LangGraph checkpointer — handy for self-pause helpers. */
  readonly checkpointer?: BaseCheckpointSaver;
}

/**
 * LangGraph node function — `(state) => partial update`.
 *
 * The generic `S` is `AgentRunState` by default, but subgraph
 * factories narrow it to their extended state shape
 * (`CompanyAnalysisState`, `PortfolioReviewState`, etc.) so nodes
 * can read subgraph-specific scratchpad keys with full types.
 */
export type LangGraphNode<S = unknown> = (state: S) => Promise<unknown>;

/**
 * Adapter — closes a node function over its deps so it conforms to
 * LangGraph's `addNode(name, fn)` signature.
 *
 * We type the return as `(state: unknown) => Promise<unknown>` so
 * LangGraph's `addNode` accepts it regardless of the precise
 * inferred state shape (LangGraph infers its own `StateType<...>`
 * per-subgraph from the annotation, which is structurally compatible
 * with the canonical `AgentRunState`).
 *
 * The inner function still gets typed state (`S`) — we cast at the
 * boundary, where LangGraph's narrower inferred type meets our
 * canonical state.
 */
export function withDeps<S, R>(
  deps: NodeDeps,
  fn: (state: S, deps: NodeDeps) => Promise<R>,
): LangGraphNode<unknown> {
  return async (state: unknown) => {
    return await fn(state as S, deps);
  };
}

/**
 * Identity node — no-op passthrough used for sequencing (graph's
 * `START` → `log-step` → next real node pattern).
 */
export const passthroughNode: LangGraphNode = async () => undefined;
