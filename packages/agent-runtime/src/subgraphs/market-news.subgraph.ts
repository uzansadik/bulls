/**
 * @openbulls/agent-runtime — market-news subgraph.
 *
 * Linear pipeline:
 *
 *   START
 *     ↓
 *   reserve-credit
 *     ↓
 *   expand-symbols
 *     ↓
 *   fetch-news
 *     ↓
 *   dedupe-group
 *     ↓
 *   summarize-news
 *     ↓
 *   finalize-usage
 *     ↓
 *   END
 */
import { StateGraph } from "@langchain/langgraph";

import { ToolCallFailedError } from "../domain/errors";
import { AgentRunStateAnnotation } from "../domain/langgraph-annotation";
import type { AgentRunState } from "../domain/state";
import type { CompiledGraphDeps, CompiledGraphFactory } from "../infrastructure/graph-factory";
import {
  DEFAULT_FINANCE_SYSTEM_PROMPT,
  DEFAULT_MODEL_KEY,
  callModelNode,
} from "../nodes/call-model.node.js";
import { finalizeUsageNode } from "../nodes/finalize-usage.node.js";
import { logStep } from "../nodes/log-step-node.js";
import { reserveCreditNode } from "../nodes/reserve-credit.node.js";

// ─── Subgraph-specific state ────────────────────────────────────────────────

export interface NewsHeadline {
  readonly symbol: string;
  readonly headline: string;
  readonly source?: string;
  readonly publishedAt: string;
  readonly url?: string;
}

export interface MarketNewsScratchpad {
  readonly symbols: ReadonlyArray<string>;
  readonly from?: string;
  readonly to?: string;
  readonly limit?: number;
  readonly expandedSymbols?: ReadonlyArray<string>;
  readonly rawItems?: ReadonlyArray<NewsHeadline>;
  readonly groups?: ReadonlyArray<{
    readonly keyword: string;
    readonly items: ReadonlyArray<NewsHeadline>;
    readonly weight: number;
  }>;
  readonly summary?: string;
}

export type MarketNewsInput = {
  readonly symbols: ReadonlyArray<string>;
  readonly from?: string;
  readonly to?: string;
  readonly limit?: number;
  readonly estimatedCostUsd?: string;
};

export type MarketNewsState = AgentRunState & MarketNewsScratchpad;

// ─── Node functions ────────────────────────────────────────────────────────

const expandSymbols = async (
  state: AgentRunState,
  deps: CompiledGraphDeps,
): Promise<Partial<AgentRunState>> => {
  const scratch = state.scratchpad as unknown as MarketNewsScratchpad;
  const symbols = scratch.symbols;
  if (symbols.length === 0) {
    throw new ToolCallFailedError("market-news", "empty symbols list");
  }
  const expanded = Array.from(
    new Set(symbols.map((s) => s.trim().toUpperCase()).filter((s) => s.length > 0)),
  );
  deps.logger.info("market-news: symbols expanded", {
    runId: state.runId,
    input: symbols.length,
    expanded: expanded.length,
  });
  return {
    scratchpad: { ...(state.scratchpad as Record<string, unknown>), expandedSymbols: expanded },
    currentNode: "expand-symbols",
  };
};

const fetchNews = async (
  state: AgentRunState,
  deps: CompiledGraphDeps,
): Promise<Partial<AgentRunState>> => {
  const md = deps.marketData;
  if (!md) throw new ToolCallFailedError("market-data", "gateway missing from deps");
  const scratch = state.scratchpad as unknown as MarketNewsScratchpad;
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
    scratchpad: { ...(state.scratchpad as Record<string, unknown>), rawItems: items },
    currentNode: "fetch-news",
  };
};

const dedupeGroup = async (state: AgentRunState): Promise<Partial<AgentRunState>> => {
  const scratch = state.scratchpad as unknown as MarketNewsScratchpad;
  const items = scratch.rawItems ?? [];
  const seen = new Set<string>();
  const unique: NewsHeadline[] = [];
  for (const item of items) {
    const key = `${item.symbol}|${item.headline.toLowerCase().slice(0, 80)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
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
    scratchpad: { ...(state.scratchpad as Record<string, unknown>), groups },
    currentNode: "dedupe-group",
  };
};

const summarize = async (
  state: AgentRunState,
  deps: CompiledGraphDeps,
): Promise<Partial<AgentRunState>> => {
  const scratch = state.scratchpad as unknown as MarketNewsScratchpad;
  const limit = scratch.limit ?? 10;
  const symbols = scratch.expandedSymbols ?? scratch.symbols;
  const groups = scratch.groups ?? [];
  const top: NewsHeadline[] = [];
  for (const g of groups) {
    if (top.length >= limit) break;
    for (const item of g.items) {
      if (top.length >= limit) break;
      if (!top.find((t) => t.headline === item.headline)) top.push(item);
    }
  }
  const userPrompt = [
    `# Symbols: ${symbols.join(", ")}`,
    scratch.from ? `# From: ${scratch.from}` : "",
    scratch.to ? `# To: ${scratch.to}` : "",
    "",
    `Captured ${scratch.rawItems?.length ?? 0} items across ${groups.length} topic clusters.`,
    "",
    "## Top Headlines",
    top
      .map((item) => {
        const ts = item.publishedAt ? ` _(${item.publishedAt})_` : "";
        return `- **${item.symbol}**${ts}: ${item.headline}`;
      })
      .join("\n"),
    "",
    "## Topic Clusters",
    groups
      .slice(0, 8)
      .map((g) => `- ${g.keyword} (${g.weight} mentions)`)
      .join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");

  const update = await callModelNode(state, deps, {
    modelKey: DEFAULT_MODEL_KEY,
    systemPrompt: `${DEFAULT_FINANCE_SYSTEM_PROMPT} Summarise the headlines into a short market-news brief. Keep it scannable, call out the most-mentioned topics, and flag anything that could move prices in the next session.`,
    userPrompt,
    outputField: "summary",
  });
  return {
    ...update,
    currentNode: "summarize-news",
  };
};

// ─── Factory ────────────────────────────────────────────────────────────────

export const marketNewsGraph: CompiledGraphFactory = (deps) => {
  const runReserve = (state: unknown) =>
    reserveCreditNode.run(state as AgentRunState, deps as CompiledGraphDeps);
  const runFinalize = (state: unknown) =>
    finalizeUsageNode.run(state as AgentRunState, deps as CompiledGraphDeps);
  const log = (stepKey: string) => (state: unknown) =>
    logStep({ stepKey }).run(state as AgentRunState, deps as CompiledGraphDeps);

  const sg = new StateGraph(AgentRunStateAnnotation)
    .addNode("reserve-credit", runReserve)
    .addNode("log-step-reserve-credit", log("reserve-credit"))
    .addNode("expand-symbols", (state) => expandSymbols(state as AgentRunState, deps))
    .addNode("log-step-expand-symbols", log("expand-symbols"))
    .addNode("fetch-news", (state) => fetchNews(state as AgentRunState, deps))
    .addNode("log-step-fetch-news", log("fetch-news"))
    .addNode("dedupe-group", (state) => dedupeGroup(state as AgentRunState))
    .addNode("log-step-dedupe-group", log("dedupe-group"))
    .addNode("summarize-news", (state) => summarize(state as AgentRunState, deps))
    .addNode("log-step-summarize-news", log("summarize-news"))
    .addNode("log-step-finalize-usage", log("finalize-usage"))
    .addNode("finalize-usage", runFinalize)
    .addEdge("__start__", "reserve-credit")
    .addEdge("reserve-credit", "log-step-reserve-credit")
    .addEdge("log-step-reserve-credit", "expand-symbols")
    .addEdge("expand-symbols", "log-step-expand-symbols")
    .addEdge("log-step-expand-symbols", "fetch-news")
    .addEdge("fetch-news", "log-step-fetch-news")
    .addEdge("log-step-fetch-news", "dedupe-group")
    .addEdge("dedupe-group", "log-step-dedupe-group")
    .addEdge("log-step-dedupe-group", "summarize-news")
    .addEdge("summarize-news", "log-step-summarize-news")
    .addEdge("log-step-summarize-news", "log-step-finalize-usage")
    .addEdge("log-step-finalize-usage", "finalize-usage")
    .addEdge("finalize-usage", "__end__");

  return sg.compile({
    checkpointer: deps.checkpointer,
  }) as unknown as ReturnType<CompiledGraphFactory>;
};
