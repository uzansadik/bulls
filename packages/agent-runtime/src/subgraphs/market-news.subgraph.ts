import { ToolCallFailedError } from "../domain/errors";
import { type GraphDefinition, GraphKey } from "../domain/graph";
import { defineNode } from "../domain/nodes";
/**
 * @openbulls/agent-runtime — market-news subgraph.
 *
 * Five-step pipeline that produces a deduped + grouped news digest for
 * one or more ticker symbols:
 *
 *   1. expand-symbols      — normalize symbol list (TRY/USD suffixes)
 *   2. fetch-news          — market-data.getNews({symbols, from, to})
 *   3. dedupe-group        — keyword cluster + weight
 *   4. summarize           — top N headlines + brief context
 *   5. END
 *
 * Each non-log step is wrapped with `logStep(...)` so the audit trail
 * captures every transition. The result lands on
 * `state.scratchpad.summary` for downstream consumers (chat surface,
 * weekly digest, notification dispatcher).
 */
import type { AgentRunState } from "../domain/state";
import { logStep } from "../nodes/log-step-node";

/** A single news headline captured from the provider. */
export interface NewsHeadline {
  readonly symbol: string;
  readonly headline: string;
  readonly source?: string;
  readonly publishedAt: string;
  readonly url?: string;
}

/** Subgraph-specific state extension. */
export interface MarketNewsScratchpad {
  readonly symbols: ReadonlyArray<string>;
  readonly from?: string;
  readonly to?: string;
  /** Maximum number of headlines to surface in the summary. */
  readonly limit?: number;
  /** Normalized symbol list (after expand-symbols). */
  readonly expandedSymbols?: ReadonlyArray<string>;
  /** Raw provider results. */
  readonly rawItems?: ReadonlyArray<NewsHeadline>;
  /** Deduped + clustered groups. */
  readonly groups?: ReadonlyArray<{
    readonly keyword: string;
    readonly items: ReadonlyArray<NewsHeadline>;
    readonly weight: number;
  }>;
  /** Final summary text (markdown). */
  readonly summary?: string;
}

export type MarketNewsState = AgentRunState & MarketNewsScratchpad;

/**
 * Cast the base-state scratchpad (typed as `Record<string, unknown>`)
 * to the typed subgraph shape. The run-graph runner preserves the
 * scratchpad across node invocations, so `Partial<S>` merges that
 * carry only `scratchpad` flow through cleanly.
 */
function pad(state: MarketNewsState): MarketNewsScratchpad {
  return state.scratchpad as unknown as MarketNewsScratchpad;
}

/** Input payload for the subgraph. */
export interface MarketNewsInput {
  readonly symbols: ReadonlyArray<string>;
  /** Optional ISO start (defaults to last 7 days). */
  readonly from?: string;
  /** Optional ISO end (defaults to now). */
  readonly to?: string;
  /** Max headlines to surface (defaults to 10). */
  readonly limit?: number;
  /** Estimated cost in USD; drives the billing reservation. */
  readonly estimatedCostUsd?: string;
}

// ─── Nodes ────────────────────────────────────────────────────────────────────

const expandSymbols = defineNode<MarketNewsState>({
  name: "expand-symbols",
  async run(state, deps) {
    const scratch = pad(state);
    const symbols = scratch.symbols;
    if (symbols.length === 0) {
      throw new ToolCallFailedError("market-news", "empty symbols list");
    }
    // Strip whitespace, uppercase, drop empties. Provider-specific
    // suffix logic (e.g. ".IS" for BIST) belongs in market-data.
    const expanded = Array.from(
      new Set(symbols.map((s) => s.trim().toUpperCase()).filter((s) => s.length > 0)),
    );
    deps.logger.info("market-news: symbols expanded", {
      runId: state.runId,
      input: symbols.length,
      expanded: expanded.length,
    });
    return {
      scratchpad: { ...scratch, expandedSymbols: expanded },
      currentNode: "expand-symbols",
    };
  },
});

const fetchNews = defineNode<MarketNewsState>({
  name: "fetch-news",
  async run(state, deps) {
    const md = deps.marketData;
    if (!md) {
      throw new ToolCallFailedError("market-data", "gateway missing from deps");
    }
    const scratch = pad(state);
    const symbols = scratch.expandedSymbols ?? scratch.symbols;
    const items = (await md.getNews({
      symbols,
      ...(scratch.from ? { from: scratch.from } : {}),
      ...(scratch.to ? { to: scratch.to } : {}),
    })) as ReadonlyArray<NewsHeadline>;
    deps.logger.info("market-news: items fetched", {
      runId: state.runId,
      symbols: symbols.length,
      items: items.length,
    });
    return {
      scratchpad: { ...scratch, rawItems: items },
      currentNode: "fetch-news",
    };
  },
});

const dedupeGroup = defineNode<MarketNewsState>({
  name: "dedupe-group",
  async run(state, _deps) {
    const scratch = pad(state);
    const items = scratch.rawItems ?? [];
    const seen = new Set<string>();
    const unique: NewsHeadline[] = [];
    for (const item of items) {
      const key = `${item.symbol}|${item.headline.toLowerCase().slice(0, 80)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(item);
    }
    // Bucket by uppercase keyword token (length >= 4 to skip stopwords).
    const buckets = new Map<string, NewsHeadline[]>();
    for (const item of unique) {
      const tokens = item.headline
        .toUpperCase()
        .split(/[^A-ZÇĞİÖŞÜ0-9]+/)
        .filter((t) => t.length >= 4);
      for (const token of tokens) {
        const bucket = buckets.get(token) ?? [];
        bucket.push(item);
        buckets.set(token, bucket);
      }
    }
    const groups = [...buckets.entries()]
      .map(([keyword, groupItems]) => ({ keyword, items: groupItems, weight: groupItems.length }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 25);
    return {
      scratchpad: { ...scratch, groups },
      currentNode: "dedupe-group",
    };
  },
});

const summarize = defineNode<MarketNewsState>({
  name: "summarize-news",
  async run(state, deps) {
    const scratch = pad(state);
    const limit = scratch.limit ?? 10;
    const symbols = scratch.expandedSymbols ?? scratch.symbols;
    const groups = scratch.groups ?? [];
    // Pick top items per group until we hit `limit`.
    const top: NewsHeadline[] = [];
    for (const g of groups) {
      if (top.length >= limit) break;
      for (const item of g.items) {
        if (top.length >= limit) break;
        if (!top.find((t) => t.headline === item.headline)) {
          top.push(item);
        }
      }
    }
    const parts: string[] = [];
    parts.push(`# Market News: ${symbols.join(", ")}`);
    parts.push("");
    parts.push(
      `Captured ${scratch.rawItems?.length ?? 0} items across ${groups.length} topic clusters.`,
    );
    parts.push("");
    parts.push("## Top Headlines");
    for (const item of top) {
      const ts = item.publishedAt ? ` _(${item.publishedAt})_` : "";
      parts.push(`- **${item.symbol}**${ts}: ${item.headline}`);
    }
    parts.push("");
    parts.push("## Topic Clusters");
    for (const g of groups.slice(0, 8)) {
      parts.push(`- ${g.keyword} (${g.weight} mentions)`);
    }
    const summary = parts.join("\n");
    deps.logger.info("market-news: summary assembled", {
      runId: state.runId,
      groups: groups.length,
      top: top.length,
      length: summary.length,
    });
    return {
      scratchpad: { ...scratch, summary },
      currentNode: "summarize-news",
    };
  },
});

// ─── Graph definition ────────────────────────────────────────────────────────

export const marketNewsGraph: GraphDefinition<MarketNewsState> = {
  key: GraphKey("market-news"),
  description:
    "Deduped + grouped news digest for one or more symbols — fetch + cluster + top-N summary",
  buildState: ({ runId, threadId, userId, input }) => {
    const payload = (input ?? {}) as Partial<MarketNewsInput>;
    const symbols = payload.symbols ?? [];
    if (symbols.length === 0) {
      throw new Error("market-news requires { symbols: string[] } input");
    }
    const base: AgentRunState = {
      runId,
      threadId,
      userId,
      graphKey: "market-news",
      status: "running",
      startedAt: new Date().toISOString(),
      messages: [],
      scratchpad: {},
      toolInvocations: [],
      ...(payload.estimatedCostUsd ? { budget: { estimatedCost: payload.estimatedCostUsd } } : {}),
    };
    const scratchpad: MarketNewsScratchpad = {
      symbols,
      ...(payload.from ? { from: payload.from } : {}),
      ...(payload.to ? { to: payload.to } : {}),
      ...(payload.limit !== undefined ? { limit: payload.limit } : {}),
    };
    return { ...base, scratchpad } as unknown as MarketNewsState;
  },
  nodes: [
    logStep({ stepKey: "expand-symbols" }),
    expandSymbols,
    logStep({ stepKey: "fetch-news" }),
    fetchNews,
    logStep({ stepKey: "dedupe-group" }),
    dedupeGroup,
    logStep({ stepKey: "summarize-news" }),
    summarize,
  ],
  idempotentNodes: new Set([
    "log-step:expand-symbols",
    "log-step:fetch-news",
    "log-step:dedupe-group",
    "log-step:summarize-news",
  ]),
};
