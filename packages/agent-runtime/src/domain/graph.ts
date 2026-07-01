/**
 * @openbulls/agent-runtime — graph registry + definition shape.
 *
 * A `GraphDefinition` is the package's portable representation of a
 * LangGraph `StateGraph`. Subgraphs register a definition; the runner
 * (`runGraph`) looks it up by key and builds an executable graph.
 *
 * The registry is in-memory; persistence of graph versions lives on
 * a later roadmap item.
 *
 * The runner treats each node as a pure async step:
 *
 *     node(state: S, deps: NodeDeps) => Promise<Partial<S>>
 *
 * Node authors receive a typed state, return only the keys they want
 * merged back. The framework stamps `currentNode` + `nextNode` and
 * asks the checkpointer for a snapshot before invoking.
 */
import { DuplicateGraphError, UnknownGraphError } from "./errors";
import type { AgentRunState } from "./state";

/**
 * Branded graph key. Identity-cast at the boundary (typed only — no
 * runtime validation in the constructor).
 */
export type GraphKey = string & { readonly __brand: "GraphKey" };
export const GraphKey = (s: string): GraphKey => s as GraphKey;

/** Dependencies handed to every node. Narrowed by composition. */
export interface NodeDeps {
  readonly logger: {
    info: (msg: string, ctx?: Record<string, unknown>) => void;
    warn: (msg: string, ctx?: Record<string, unknown>) => void;
    error: (msg: string, ctx?: Record<string, unknown>) => void;
  };
  /** Monotonic clock (ms). Allows tests to inject a fixed clock. */
  readonly now: () => number;
}

/** A single graph node. Returns a partial state merged into the run. */
export interface NodeDefinition<S extends AgentRunState = AgentRunState> {
  readonly name: string;
  /**
   * Optional — when true the runner skips executing this node if the
   * loaded snapshot's `currentNode` is already past it. Reserved for
   * "log-only" / no-op nodes.
   */
  readonly idempotent?: boolean;
  run(state: S, deps: NodeDeps): Promise<Partial<S>>;
}

/** A complete graph definition registered in the registry. */
export interface GraphDefinition<S extends AgentRunState = AgentRunState> {
  readonly key: GraphKey;
  readonly description: string;
  /** Initial state factory — runs before `loadLatestSnapshot`. */
  readonly buildState: (input: {
    readonly runId: string;
    readonly threadId: string;
    readonly userId: string;
    readonly input: unknown;
  }) => S;
  /** Topologically ordered node sequence (START -> ... -> END). */
  readonly nodes: readonly NodeDefinition<S>[];
  /** Names of nodes that may be safely skipped during resume. */
  readonly idempotentNodes?: ReadonlySet<string>;
}

/**
 * In-memory graph registry. Lazily instantiated by the composition
 * root, then frozen by `registerDefaultGraphs`.
 */
export class GraphRegistry {
  private readonly graphs = new Map<string, GraphDefinition<AgentRunState>>();

  /**
   * Register a graph. Throws on duplicate key — surfaces programmer
   * error at boot rather than silently overwriting.
   */
  register<S extends AgentRunState>(definition: GraphDefinition<S>): this {
    const key = definition.key as unknown as string;
    if (this.graphs.has(key)) {
      throw new DuplicateGraphError(key);
    }
    this.graphs.set(key, definition as unknown as GraphDefinition<AgentRunState>);
    return this;
  }

  /** Look up a graph by key. Throws `UnknownGraphError` if absent. */
  find(key: GraphKey): GraphDefinition<AgentRunState> {
    const def = this.graphs.get(key as unknown as string);
    if (!def) {
      throw new UnknownGraphError(key as unknown as string);
    }
    return def;
  }

  /** Type-narrowed lookup. Avoids `as` casts in subgraph code. */
  findAs<S extends AgentRunState>(key: GraphKey): GraphDefinition<S> {
    return this.find(key) as unknown as GraphDefinition<S>;
  }

  /** All registered keys, sorted for stable iteration. */
  list(): readonly GraphKey[] {
    return [...this.graphs.keys()].sort().map((k) => GraphKey(k));
  }

  /** Snapshot of (key, description) tuples for telemetry / debug. */
  listWithDescriptions(): ReadonlyArray<{
    readonly key: GraphKey;
    readonly description: string;
  }> {
    return [...this.graphs.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, def]) => ({ key: GraphKey(k), description: def.description }));
  }

  /** Number of registered graphs. */
  get size(): number {
    return this.graphs.size;
  }
}
