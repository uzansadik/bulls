/**
 * @openbulls/agent-runtime — branded GraphKey.
 *
 * A `GraphKey` is a typed string identifier (e.g. `"company-analysis"`,
 * `"portfolio-review"`, `"market-news"`). The brand lets the compiler
 * reject accidental misuse in places that take a plain `string`.
 *
 * Construction is identity-only — runtime validation lives in the
 * factory map (`defaultGraphFactories`) and surfaces as "unknown
 * graph key" errors at compose time.
 */

/**
 * Branded graph key. Identity-cast at the boundary (typed only — no
 * runtime validation in the constructor).
 */
export type GraphKey = string & { readonly __brand: "GraphKey" };
export const GraphKey = (s: string): GraphKey => s as GraphKey;