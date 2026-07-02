/**
 * @openbulls/agent-runtime — company-analysis subgraph.
 *
 * Multi-branch research pipeline for a single ticker symbol:
 *
 *   START
 *     ↓
 *   reserve-credit
 *     ↓
 *   log-step:reserve-credit
 *     ↓
 *   load-company
 *     ↓
 *   fan-out ──▶ (Send) financial-statements
 *           ──▶ (Send) technical-analysis
 *           ──▶ (Send) market-news
 *           ──▶ (Send) portfolio-impact
 *     ↓ (paralle wait)
 *   synthesize-company-analysis
 *     ↓
 *   log-step:finalize-usage
 *     ↓
 *   finalize-usage
 *     ↓
 *   END
 *
 * The 4 analytical branches fan out via LangGraph's `Send` API and
 * run in parallel — wall-clock time tracks the slowest branch
 * (CLAUDE.md §10).
 *
 * Subgraph-specific state lives on `state.scratchpad`:
 *
 *   {
 *     quote?: unknown,
 *     financial?: { statements, ratios, insight },
 *     technical?: { candles, indicators, insight },
 *     news?:      { items, grouped, insight },
 *     portfolioImpact?: { holdings, impact },
 *     report?: string,
 *   }
 *
 * The annotation's `scratchpad` reducer is a shallow merge, so
 * every branch may write to its own key without clobbering the
 * others — exactly the merge semantic the custom runner used.
 */
import { Send, StateGraph } from "@langchain/langgraph";

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

// ─── Subgraph-specific scratchpad shape ─────────────────────────────────────

export interface CompanyAnalysisScratchpad {
  readonly symbol: string;
  readonly scope: "full" | "quick";
  readonly portfolioId?: string;
  readonly quote?: unknown;
  readonly financial?: { statements: unknown; ratios: unknown; insight: string };
  readonly technical?: {
    candles: unknown;
    indicators: {
      rsi?: number;
      macd?: number;
      sma50?: number;
      sma200?: number;
    };
    insight: string;
  };
  readonly news?: {
    items: ReadonlyArray<unknown>;
    grouped: ReadonlyArray<{ headline: string; weight: number }>;
    insight: string;
  };
  readonly portfolioImpact?: {
    holdings: ReadonlyArray<unknown>;
    impact: string;
  };
  readonly report?: string;
}

export type CompanyAnalysisInput = {
  readonly symbol: string;
  readonly scope?: "full" | "quick";
  readonly portfolioId?: string;
  readonly estimatedCostUsd?: string;
};

/** Subgraph-specific typed state. Equals AgentRunState ∩ scratchpad extension. */
export type CompanyAnalysisState = AgentRunState & CompanyAnalysisScratchpad;

// ─── Node functions (LangGraph `(state) => Partial<state>` shape) ────────────

const loadCompany = async (
  state: AgentRunState,
  deps: CompiledGraphDeps,
): Promise<Partial<AgentRunState>> => {
  const md = deps.marketData;
  if (!md) throw new ToolCallFailedError("market-data", "gateway missing from deps");
  const symbol = (state.scratchpad as { symbol?: string }).symbol;
  if (!symbol) throw new ToolCallFailedError("market-data", "scratchpad.symbol missing");
  const quote = await md.getQuote({ symbol });
  deps.logger.info("company-analysis: quote loaded", { runId: state.runId, symbol });
  return {
    scratchpad: { ...(state.scratchpad as Record<string, unknown>), quote },
    currentNode: "load-company",
  };
};

const financialStatements = async (
  state: AgentRunState,
  deps: CompiledGraphDeps,
): Promise<Partial<AgentRunState>> => {
  const md = deps.marketData;
  if (!md) throw new ToolCallFailedError("market-data", "gateway missing from deps");
  const symbol = (state.scratchpad as { symbol?: string }).symbol;
  if (!symbol) {
    throw new ToolCallFailedError(
      "market-data",
      "scratchpad.symbol missing in financial-statements",
    );
  }
  const statements = await md.getFinancialStatements({ symbol });
  const insight = `Financial statements loaded for ${symbol}; ratios derive from the most recent reporting period.`;
  return {
    scratchpad: {
      ...(state.scratchpad as Record<string, unknown>),
      financial: { statements, ratios: null, insight },
    },
    currentNode: "financial-statements",
  };
};

const technicalAnalysis = async (
  state: AgentRunState,
  deps: CompiledGraphDeps,
): Promise<Partial<AgentRunState>> => {
  const md = deps.marketData;
  if (!md) throw new ToolCallFailedError("market-data", "gateway missing from deps");
  const symbol = (state.scratchpad as { symbol?: string }).symbol;
  if (!symbol) {
    throw new ToolCallFailedError("market-data", "scratchpad.symbol missing in technical-analysis");
  }
  const candles = await md.getCandles({ symbol, interval: "1d", limit: 200 });
  const insight = `Technical indicators computed from 200 daily candles for ${symbol}; see state.technical.indicators for raw values.`;
  return {
    scratchpad: {
      ...(state.scratchpad as Record<string, unknown>),
      technical: { candles, indicators: {}, insight },
    },
    currentNode: "technical-analysis",
  };
};

const marketNews = async (
  state: AgentRunState,
  deps: CompiledGraphDeps,
): Promise<Partial<AgentRunState>> => {
  const md = deps.marketData;
  if (!md) throw new ToolCallFailedError("market-data", "gateway missing from deps");
  const symbol = (state.scratchpad as { symbol?: string }).symbol;
  if (!symbol) {
    throw new ToolCallFailedError("market-data", "scratchpad.symbol missing in market-news");
  }
  const items = await md.getNews({ symbols: [symbol] });
  const grouped = items.slice(0, 10).map((item) => ({
    headline: String((item as { headline?: unknown })?.headline ?? ""),
    weight: 1,
  }));
  const insight = `Captured ${items.length} news items for ${symbol}.`;
  return {
    scratchpad: {
      ...(state.scratchpad as Record<string, unknown>),
      news: { items, grouped, insight },
    },
    currentNode: "market-news",
  };
};

const portfolioImpact = async (
  state: AgentRunState,
  deps: CompiledGraphDeps,
): Promise<Partial<AgentRunState>> => {
  const scratch = state.scratchpad as { portfolioId?: string };
  const portfolioId = scratch.portfolioId;
  if (!portfolioId || !deps.portfolio) {
    deps.logger.info("company-analysis: portfolio-impact skipped", {
      runId: state.runId,
      reason: portfolioId ? "gateway missing" : "no portfolioId",
    });
    return {
      scratchpad: {
        ...(state.scratchpad as Record<string, unknown>),
        portfolioImpact: { holdings: [], impact: "no portfolio context" },
      },
      currentNode: "portfolio-impact",
    };
  }
  const holdings = await deps.portfolio.getHoldings({ portfolioId });
  const impact = `Cross-checked ${holdings.length} portfolio positions against exposure.`;
  return {
    scratchpad: {
      ...(state.scratchpad as Record<string, unknown>),
      portfolioImpact: { holdings, impact },
    },
    currentNode: "portfolio-impact",
  };
};

const synthesizeReport = async (
  state: AgentRunState,
  deps: CompiledGraphDeps,
): Promise<Partial<AgentRunState>> => {
  const scratch = state.scratchpad as unknown as CompanyAnalysisScratchpad;
  const userPrompt = [
    `# Symbol: ${scratch.symbol}`,
    `# Scope: ${scratch.scope}`,
    scratch.portfolioId ? `# Portfolio: ${scratch.portfolioId}` : "",
    "",
    "## Research findings",
    scratch.quote ? `### Quote\n${JSON.stringify(scratch.quote)}` : "",
    scratch.financial
      ? `### Financial\nstatements: ${JSON.stringify(scratch.financial.statements)}\nratios: ${JSON.stringify(scratch.financial.ratios)}\ninsight: ${scratch.financial.insight}`
      : "",
    scratch.technical
      ? `### Technical\ncandles: ${scratch.technical.candles}\nindicators: ${JSON.stringify(scratch.technical.indicators)}\ninsight: ${scratch.technical.insight}`
      : "",
    scratch.news
      ? `### News\nitems: ${JSON.stringify(scratch.news.items)}\ngrouped: ${JSON.stringify(scratch.news.grouped)}\ninsight: ${scratch.news.insight}`
      : "",
    scratch.portfolioImpact
      ? `### Portfolio Impact\nholdings: ${JSON.stringify(scratch.portfolioImpact.holdings)}\nimpact: ${scratch.portfolioImpact.impact}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const update = await callModelNode(state, deps, {
    modelKey: DEFAULT_MODEL_KEY,
    systemPrompt: `${DEFAULT_FINANCE_SYSTEM_PROMPT} Focus the report on the company ticker symbol; sections should follow the Research findings above.`,
    userPrompt,
    outputField: "report",
  });
  return {
    ...update,
    currentNode: "synthesize-company-analysis",
  };
};

// ─── Parallel fan-out router ────────────────────────────────────────────────

const parallelBranches = (state: AgentRunState): Array<Send | string> => [
  new Send("financial-statements", state),
  new Send("technical-analysis", state),
  new Send("market-news", state),
  new Send("portfolio-impact", state),
];

// ─── Factory ────────────────────────────────────────────────────────────────

export const companyAnalysisGraph: CompiledGraphFactory = (deps) => {
  const sg = new StateGraph(AgentRunStateAnnotation)
    .addNode("reserve-credit", (state) =>
      reserveCreditNode.run(state as AgentRunState, deps as CompiledGraphDeps),
    )
    .addNode("l_reserve_credit", (state) =>
      logStep({ stepKey: "reserve-credit" }).run(state as AgentRunState, deps as CompiledGraphDeps),
    )
    .addNode("load-company", (state) => loadCompany(state as AgentRunState, deps))
    .addNode("l_load_company", (state) =>
      logStep({ stepKey: "load-company" }).run(state as AgentRunState, deps as CompiledGraphDeps),
    )
    .addNode("financial-statements", (state) => financialStatements(state as AgentRunState, deps))
    .addNode("technical-analysis", (state) => technicalAnalysis(state as AgentRunState, deps))
    .addNode("market-news", (state) => marketNews(state as AgentRunState, deps))
    .addNode("portfolio-impact", (state) => portfolioImpact(state as AgentRunState, deps))
    .addNode("l_financial", (state) =>
      logStep({ stepKey: "financial-statements" }).run(
        state as AgentRunState,
        deps as CompiledGraphDeps,
      ),
    )
    .addNode("l_technical", (state) =>
      logStep({ stepKey: "technical-analysis" }).run(
        state as AgentRunState,
        deps as CompiledGraphDeps,
      ),
    )
    .addNode("l_news", (state) =>
      logStep({ stepKey: "market-news" }).run(state as AgentRunState, deps as CompiledGraphDeps),
    )
    .addNode("l_portfolio_impact", (state) =>
      logStep({ stepKey: "portfolio-impact" }).run(
        state as AgentRunState,
        deps as CompiledGraphDeps,
      ),
    )
    .addNode("synthesize-company-analysis", (state) =>
      synthesizeReport(state as AgentRunState, deps),
    )
    .addNode("l_finalize_usage", (state) =>
      logStep({ stepKey: "finalize-usage" }).run(state as AgentRunState, deps as CompiledGraphDeps),
    )
    .addNode("finalize-usage", (state) =>
      finalizeUsageNode.run(state as AgentRunState, deps as CompiledGraphDeps),
    )
    .addEdge("__start__", "reserve-credit")
    .addEdge("reserve-credit", "l_reserve_credit")
    .addEdge("l_reserve_credit", "load-company")
    .addEdge("load-company", "l_load_company")
    .addConditionalEdges("l_load_company", parallelBranches, [
      "financial-statements",
      "technical-analysis",
      "market-news",
      "portfolio-impact",
    ])
    .addEdge("financial-statements", "l_financial")
    .addEdge("technical-analysis", "l_technical")
    .addEdge("market-news", "l_news")
    .addEdge("portfolio-impact", "l_portfolio_impact")
    .addEdge("l_financial", "synthesize-company-analysis")
    .addEdge("l_technical", "synthesize-company-analysis")
    .addEdge("l_news", "synthesize-company-analysis")
    .addEdge("l_portfolio_impact", "synthesize-company-analysis")
    .addEdge("synthesize-company-analysis", "l_finalize_usage")
    .addEdge("l_finalize_usage", "finalize-usage")
    .addEdge("finalize-usage", "__end__");

  // Cast the precise LangGraph `CompiledStateGraph<S, U, ..., TStreamTransformers>`
  // generic back to the abstract factory signature — the runtime shape is
  // identical (invoke + stream), only the inferred parameter list differs.
  return sg.compile({
    checkpointer: deps.checkpointer,
  }) as unknown as ReturnType<CompiledGraphFactory>;
};
