import type { NodeDefinition, NodeDeps } from "./graph";
/**
 * @openbulls/agent-runtime — node composition helpers.
 *
 * Most nodes are tiny: load a value from a service, mutate the state,
 * return the diff. `defineNode` keeps that boilerplate in one place
 * and lets the type checker infer the partial return type.
 */
import type { AgentRunState } from "./state";

/**
 * Helper to declare a typed node without spelling out the generics
 * each time. The factory:
 *   - takes a `name` (used for logging + checkpoint key)
 *   - takes a `run` function
 *   - returns a `NodeDefinition<S>`
 *
 * Example:
 *   const loadQuote = defineNode<CompanyAnalysisState>({
 *     name: "load-company",
 *     run: async (state, { marketData }) => {
 *       const quote = await marketData.getQuote({ symbol: state.symbol });
 *       return { scratchpad: { ...state.scratchpad, quote } };
 *     },
 *   });
 */
export function defineNode<S extends AgentRunState>(args: {
  readonly name: string;
  readonly idempotent?: boolean;
  readonly run: (state: S, deps: NodeDeps) => Promise<Partial<S>>;
}): NodeDefinition<S> {
  return args;
}
