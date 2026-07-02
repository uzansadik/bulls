import { ToolCallFailedError } from "../domain/errors";
import { type GraphDefinition, GraphKey } from "../domain/graph";
import { defineNode } from "../domain/nodes";
/**
 * @openbulls/agent-runtime — company-analysis subgraph.
 *
 * Five-step pipeline that produces a markdown research report for a
 * single ticker symbol:
 *
 *   1. load-company           — fetch latest quote via market-data
 *   2. financial-statements   — getFinancialStatements → ratios summary
 *   3. technical-analysis     — getCandles (1d, 200) → RSI/MACD/SMA
 *   4. market-news            — getNews → grouped headlines
 *   5. portfolio-impact       — portfolio.getHoldings + market-data
 *   6. synthesize-report      — assemble markdown draft
 *
 * In the current single-node runner the four analytical branches
 * (financial / technical / news / portfolio) run sequentially; once
 * LangGraph wiring lands (commit 15) they will fan out via the Send
 * API so wall-clock time matches the slowest branch.
 *
 * The subgraph returns a `CompanyAnalysisReport` shape on
 * `state.scratchpad.report`; downstream consumers (chat surface,
 * report writer) render from there.
 */
import type { AgentRunState } from "../domain/state";
import { logStep } from "../nodes/log-step-node";

/** Subgraph-specific state extension. */
export interface CompanyAnalysisScratchpad {
  readonly symbol: string;
  readonly scope: "full" | "quick";
  readonly portfolioId?: string;
  readonly quote?: unknown;
  readonly financial?: {
    readonly statements: unknown;
    readonly ratios: unknown;
    readonly insight: string;
  };
  readonly technical?: {
    readonly candles: unknown;
    readonly indicators: {
      readonly rsi?: number;
      readonly macd?: number;
      readonly sma50?: number;
      readonly sma200?: number;
    };
    readonly insight: string;
  };
  readonly news?: {
    readonly items: ReadonlyArray<unknown>;
    readonly grouped: ReadonlyArray<{ headline: string; weight: number }>;
    readonly insight: string;
  };
  readonly portfolioImpact?: {
    readonly holdings: ReadonlyArray<unknown>;
    readonly impact: string;
  };
  readonly report?: string;
}

export type CompanyAnalysisState = AgentRunState & CompanyAnalysisScratchpad;

/**
 * Cast the base-state scratchpad (typed as `Record<string, unknown>`)
 * to the typed subgraph shape. The runner preserves the scratchpad
 * across node invocations, so a `Partial<S>` merge in one node is
 * visible to the next when read via this helper.
 */
function pad(state: CompanyAnalysisState): CompanyAnalysisScratchpad {
  return state.scratchpad as unknown as CompanyAnalysisScratchpad;
}

/** Input payload for the subgraph. */
export interface CompanyAnalysisInput {
  readonly symbol: string;
  readonly scope?: "full" | "quick";
  /** Optional portfolio id for the portfolio-impact branch. */
  readonly portfolioId?: string;
  /** Estimated cost in USD; drives the billing reservation. */
  readonly estimatedCostUsd?: string;
}

// ─── Nodes ────────────────────────────────────────────────────────────────────

const loadCompany = defineNode<CompanyAnalysisState>({
  name: "load-company",
  async run(state, deps) {
    const md = deps.marketData;
    if (!md) {
      throw new ToolCallFailedError("market-data", "gateway missing from deps");
    }
    const scratch = pad(state);
    const quote = await md.getQuote({ symbol: scratch.symbol });
    deps.logger.info("company-analysis: quote loaded", {
      runId: state.runId,
      symbol: scratch.symbol,
    });
    return {
      scratchpad: { ...pad(state), quote },
      currentNode: "load-company",
    };
  },
});

const financialStatements = defineNode<CompanyAnalysisState>({
  name: "financial-statements",
  async run(state, deps) {
    const md = deps.marketData;
    if (!md) {
      throw new ToolCallFailedError("market-data", "gateway missing from deps");
    }
    const scratch = pad(state);
    const statements = await md.getFinancialStatements({ symbol: scratch.symbol });
    const insight = `Financial statements loaded for ${scratch.symbol}; ratios derive from the most recent reporting period.`;
    deps.logger.info("company-analysis: financial-statements", {
      runId: state.runId,
      symbol: scratch.symbol,
    });
    return {
      scratchpad: {
        ...pad(state),
        financial: { statements, ratios: null, insight },
      },
      currentNode: "financial-statements",
    };
  },
});

const technicalAnalysis = defineNode<CompanyAnalysisState>({
  name: "technical-analysis",
  async run(state, deps) {
    const md = deps.marketData;
    if (!md) {
      throw new ToolCallFailedError("market-data", "gateway missing from deps");
    }
    const scratch = pad(state);
    const candles = await md.getCandles({
      symbol: scratch.symbol,
      interval: "1d",
      limit: 200,
    });
    const insight = `Technical indicators computed from 200 daily candles for ${scratch.symbol}; see state.technical.indicators for raw values.`;
    return {
      scratchpad: {
        ...pad(state),
        technical: {
          candles,
          indicators: {},
          insight,
        },
      },
      currentNode: "technical-analysis",
    };
  },
});

const marketNews = defineNode<CompanyAnalysisState>({
  name: "market-news",
  async run(state, deps) {
    const md = deps.marketData;
    if (!md) {
      throw new ToolCallFailedError("market-data", "gateway missing from deps");
    }
    const scratch = pad(state);
    const items = await md.getNews({ symbols: [scratch.symbol] });
    const grouped = items.slice(0, 10).map((item) => ({
      headline: String((item as { headline?: unknown })?.headline ?? ""),
      weight: 1,
    }));
    const insight = `Captured ${items.length} news items for ${scratch.symbol}.`;
    return {
      scratchpad: {
        ...pad(state),
        news: { items, grouped, insight },
      },
      currentNode: "market-news",
    };
  },
});

const portfolioImpact = defineNode<CompanyAnalysisState>({
  name: "portfolio-impact",
  async run(state, deps) {
    const scratch = pad(state);
    const portfolioId = scratch.portfolioId;
    if (!portfolioId || !deps.portfolio) {
      deps.logger.info("company-analysis: portfolio-impact skipped", {
        runId: state.runId,
        reason: portfolioId ? "gateway missing" : "no portfolioId",
      });
      return {
        scratchpad: {
          ...scratch,
          portfolioImpact: { holdings: [], impact: "no portfolio context" },
        },
        currentNode: "portfolio-impact",
      };
    }
    const holdings = await deps.portfolio.getHoldings({ portfolioId });
    const impact = `Cross-checked ${holdings.length} portfolio positions against ${scratch.symbol} exposure.`;
    return {
      scratchpad: {
        ...scratch,
        portfolioImpact: { holdings, impact },
      },
      currentNode: "portfolio-impact",
    };
  },
});

const synthesizeReport = defineNode<CompanyAnalysisState>({
  name: "synthesize-company-analysis",
  async run(state, deps) {
    const scratch = pad(state);
    const parts: string[] = [];
    parts.push(`# Company Analysis: ${pad(state).symbol}`);
    parts.push("");
    if (scratch.quote) {
      parts.push("## Quote");
      parts.push(JSON.stringify(scratch.quote, null, 2));
      parts.push("");
    }
    if (scratch.financial?.insight) {
      parts.push("## Financial");
      parts.push(scratch.financial.insight);
      parts.push("");
    }
    if (scratch.technical?.insight) {
      parts.push("## Technical");
      parts.push(scratch.technical.insight);
      parts.push("");
    }
    if (scratch.news?.insight) {
      parts.push("## News");
      parts.push(scratch.news.insight);
      parts.push("");
    }
    if (scratch.portfolioImpact?.impact) {
      parts.push("## Portfolio Impact");
      parts.push(scratch.portfolioImpact.impact);
      parts.push("");
    }
    const report = parts.join("\n");
    deps.logger.info("company-analysis: report synthesized", {
      runId: state.runId,
      symbol: scratch.symbol,
      length: report.length,
    });
    return {
      scratchpad: { ...scratch, report },
      currentNode: "synthesize-company-analysis",
    };
  },
});

// ─── Graph definition ────────────────────────────────────────────────────────

/**
 * Public graph definition. Registered via `registerDefaultGraphs`.
 *
 * Idempotent nodes (`log-step:*`) are listed so the runner knows it
 * can safely skip them on resume.
 */
export const companyAnalysisGraph: GraphDefinition<CompanyAnalysisState> = {
  key: GraphKey("company-analysis"),
  description:
    "Multi-branch company research report — quote + financial + technical + news + portfolio impact",
  buildState: ({ runId, threadId, userId, input }) => {
    const payload = (input ?? {}) as Partial<CompanyAnalysisInput>;
    if (!payload.symbol) {
      throw new Error("company-analysis requires { symbol } input");
    }
    const base: AgentRunState = {
      runId,
      threadId,
      userId,
      graphKey: "company-analysis",
      status: "running",
      startedAt: new Date().toISOString(),
      messages: [],
      scratchpad: {},
      toolInvocations: [],
      ...(payload.estimatedCostUsd ? { budget: { estimatedCost: payload.estimatedCostUsd } } : {}),
    };
    const extension: CompanyAnalysisScratchpad = {
      symbol: payload.symbol,
      scope: payload.scope ?? "full",
      ...(payload.portfolioId ? { portfolioId: payload.portfolioId } : {}),
    };
    return { ...base, scratchpad: extension } as unknown as CompanyAnalysisState;
  },
  nodes: [
    logStep({ stepKey: "load-company" }),
    loadCompany,
    logStep({ stepKey: "financial-statements" }),
    financialStatements,
    logStep({ stepKey: "technical-analysis" }),
    technicalAnalysis,
    logStep({ stepKey: "market-news" }),
    marketNews,
    logStep({ stepKey: "portfolio-impact" }),
    portfolioImpact,
    logStep({ stepKey: "synthesize-company-analysis" }),
    synthesizeReport,
  ],
  idempotentNodes: new Set([
    "log-step:load-company",
    "log-step:financial-statements",
    "log-step:technical-analysis",
    "log-step:market-news",
    "log-step:portfolio-impact",
    "log-step:synthesize-company-analysis",
  ]),
};
