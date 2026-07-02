/**
 * @openbulls/agent-runtime — portfolio-review subgraph.
 *
 * Linear pipeline:
 *
 *   START
 *     ↓
 *   reserve-credit
 *     ↓
 *   load-portfolio
 *     ↓
 *   calculate-performance
 *     ↓
 *   risk-flags
 *     ↓
 *   recommendations
 *     ↓
 *   synthesize-portfolio-review
 *     ↓
 *   finalize-usage
 *     ↓
 *   END
 *
 * Subgraph-specific scratchpad:
 *   {
 *     portfolioId, from?, to?,
 *     overview?, performance?,
 *     riskFlags?: { concentration, drawdownPct, insights },
 *     recommendations?: [{ title, rationale }],
 *     report?
 *   }
 */
import { StateGraph } from "@langchain/langgraph";

import { AgentRunStateAnnotation } from "../domain/langgraph-annotation";
import { ToolCallFailedError } from "../domain/errors";
import type { CompiledGraphDeps, CompiledGraphFactory } from "../infrastructure/graph-factory";
import { finalizeUsageNode } from "../nodes/finalize-usage.node.js";
import { logStep } from "../nodes/log-step-node.js";
import { reserveCreditNode } from "../nodes/reserve-credit.node.js";
import type { AgentRunState } from "../domain/state";

// ─── Subgraph-specific state ────────────────────────────────────────────────

export interface PortfolioReviewScratchpad {
  readonly portfolioId: string;
  readonly from?: string;
  readonly to?: string;
  readonly overview?: unknown;
  readonly performance?: unknown;
  readonly riskFlags?: {
    readonly concentration: ReadonlyArray<{ symbol: string; weight: number }>;
    readonly drawdownPct: number;
    readonly insights: ReadonlyArray<string>;
  };
  readonly recommendations?: ReadonlyArray<{ title: string; rationale: string }>;
  readonly report?: string;
}

export type PortfolioReviewInput = {
  readonly portfolioId: string;
  readonly from?: string;
  readonly to?: string;
  readonly estimatedCostUsd?: string;
};

export type PortfolioReviewState = AgentRunState & PortfolioReviewScratchpad;

// ─── Node functions ────────────────────────────────────────────────────────

const loadPortfolio = async (
  state: AgentRunState,
  deps: CompiledGraphDeps,
): Promise<Partial<AgentRunState>> => {
  const portfolio = deps.portfolio;
  if (!portfolio) throw new ToolCallFailedError("portfolio", "gateway missing from deps");
  const portfolioId = (state.scratchpad as { portfolioId?: string }).portfolioId;
  if (!portfolioId) {
    throw new ToolCallFailedError("portfolio", "scratchpad.portfolioId missing");
  }
  const overview = await portfolio.getPortfolioOverview({ portfolioId });
  deps.logger.info("portfolio-review: overview loaded", {
    runId: state.runId,
    portfolioId,
  });
  return {
    scratchpad: { ...(state.scratchpad as Record<string, unknown>), overview },
    currentNode: "load-portfolio",
  };
};

const calculatePerformance = async (
  state: AgentRunState,
  deps: CompiledGraphDeps,
): Promise<Partial<AgentRunState>> => {
  const portfolio = deps.portfolio;
  if (!portfolio) throw new ToolCallFailedError("portfolio", "gateway missing from deps");
  const scratch = state.scratchpad as unknown as PortfolioReviewScratchpad;
  const now = new Date(deps.now());
  const to = scratch.to ?? now.toISOString();
  const fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const from = scratch.from ?? fromDate.toISOString();
  const performance = await portfolio.getPerformance({
    portfolioId: scratch.portfolioId,
    from,
    to,
  });
  deps.logger.info("portfolio-review: performance window computed", {
    runId: state.runId,
    portfolioId: scratch.portfolioId,
    from,
    to,
  });
  return {
    scratchpad: { ...(state.scratchpad as Record<string, unknown>), performance },
    currentNode: "calculate-performance",
  };
};

const riskFlags = async (state: AgentRunState): Promise<Partial<AgentRunState>> => {
  const scratch = state.scratchpad as unknown as PortfolioReviewScratchpad;
  const insights: string[] = [];
  const overview = scratch.overview as
    | { readonly holdings?: ReadonlyArray<{ symbol: string; weight: number }> }
    | undefined;
  const concentration = overview?.holdings ?? [];
  const top = concentration[0];
  if (top && top.weight > 0.4) {
    insights.push(
      `Top holding ${top.symbol} represents ${(top.weight * 100).toFixed(1)}% — concentration risk.`,
    );
  }
  const performance = scratch.performance as { readonly maxDrawdownPct?: number } | undefined;
  const drawdownPct = performance?.maxDrawdownPct ?? 0;
  if (drawdownPct > 0.2) {
    insights.push(
      `Peak-to-trough drawdown ${(drawdownPct * 100).toFixed(1)}% exceeds the 20% guideline.`,
    );
  }
  return {
    scratchpad: {
      ...(state.scratchpad as Record<string, unknown>),
      riskFlags: { concentration, drawdownPct, insights },
    },
    currentNode: "risk-flags",
  };
};

const recommendations = async (state: AgentRunState): Promise<Partial<AgentRunState>> => {
  const scratch = state.scratchpad as unknown as PortfolioReviewScratchpad;
  const out: Array<{ title: string; rationale: string }> = [];
  const flags = scratch.riskFlags;
  if (!flags) {
    return {
      scratchpad: { ...(state.scratchpad as Record<string, unknown>), recommendations: out },
      currentNode: "recommendations",
    };
  }
  const top = flags.concentration[0];
  if (top && top.weight > 0.4) {
    out.push({
      title: `Trim ${top.symbol} below 30%`,
      rationale: `Current weight is ${(top.weight * 100).toFixed(1)}%; a 30% cap limits single-name drawdowns.`,
    });
  }
  if (flags.drawdownPct > 0.2) {
    out.push({
      title: "Review hedging strategy",
      rationale: `Drawdown of ${(flags.drawdownPct * 100).toFixed(1)}% suggests adding a defensive sleeve (cash, treasuries, or inverse ETF).`,
    });
  }
  if (out.length === 0) {
    out.push({
      title: "Maintain current allocation",
      rationale: "Portfolio risk metrics are within target ranges; no rebalance required.",
    });
  }
  return {
    scratchpad: { ...(state.scratchpad as Record<string, unknown>), recommendations: out },
    currentNode: "recommendations",
  };
};

const synthesizeReport = async (
  state: AgentRunState,
  deps: CompiledGraphDeps,
): Promise<Partial<AgentRunState>> => {
  const scratch = state.scratchpad as unknown as PortfolioReviewScratchpad;
  const parts: string[] = [];
  parts.push(`# Portfolio Review: ${scratch.portfolioId}`);
  parts.push("");
  if (scratch.riskFlags) {
    parts.push("## Risk Flags");
    for (const line of scratch.riskFlags.insights) parts.push(`- ${line}`);
    parts.push("");
  }
  if (scratch.recommendations) {
    parts.push("## Recommendations");
    for (const r of scratch.recommendations) {
      parts.push(`### ${r.title}\n${r.rationale}\n`);
    }
  }
  const report = parts.join("\n");
  deps.logger.info("portfolio-review: report synthesized", {
    runId: state.runId,
    portfolioId: scratch.portfolioId,
    length: report.length,
  });
  return {
    scratchpad: { ...(state.scratchpad as Record<string, unknown>), report },
    currentNode: "synthesize-portfolio-review",
  };
};

// ─── Factory ────────────────────────────────────────────────────────────────

export const portfolioReviewGraph: CompiledGraphFactory = (deps) => {
  const runReserve = (state: unknown) =>
    reserveCreditNode.run(state as AgentRunState, deps as CompiledGraphDeps);
  const runFinalize = (state: unknown) =>
    finalizeUsageNode.run(state as AgentRunState, deps as CompiledGraphDeps);
  const log = (stepKey: string) => (state: unknown) =>
    logStep({ stepKey }).run(state as AgentRunState, deps as CompiledGraphDeps);

  const sg = new StateGraph(AgentRunStateAnnotation)
    .addNode("reserve-credit", runReserve)
    .addNode("log-step:reserve-credit", log("reserve-credit"))
    .addNode("load-portfolio", (state) =>
      loadPortfolio(state as AgentRunState, deps),
    )
    .addNode("log-step:load-portfolio", log("load-portfolio"))
    .addNode("calculate-performance", (state) =>
      calculatePerformance(state as AgentRunState, deps),
    )
    .addNode("log-step:calculate-performance", log("calculate-performance"))
    .addNode("risk-flags", (state) => riskFlags(state as AgentRunState))
    .addNode("log-step:risk-flags", log("risk-flags"))
    .addNode("recommendations", (state) =>
      recommendations(state as AgentRunState),
    )
    .addNode("log-step:recommendations", log("recommendations"))
    .addNode("synthesize-portfolio-review", (state) =>
      synthesizeReport(state as AgentRunState, deps),
    )
    .addNode("log-step:finalize-usage", log("finalize-usage"))
    .addNode("finalize-usage", runFinalize)
    .addEdge("__start__", "reserve-credit")
    .addEdge("reserve-credit", "log-step:reserve-credit")
    .addEdge("log-step:reserve-credit", "load-portfolio")
    .addEdge("load-portfolio", "log-step:load-portfolio")
    .addEdge("log-step:load-portfolio", "calculate-performance")
    .addEdge("calculate-performance", "log-step:calculate-performance")
    .addEdge("log-step:calculate-performance", "risk-flags")
    .addEdge("risk-flags", "log-step:risk-flags")
    .addEdge("log-step:risk-flags", "recommendations")
    .addEdge("recommendations", "log-step:recommendations")
    .addEdge("log-step:recommendations", "synthesize-portfolio-review")
    .addEdge("synthesize-portfolio-review", "log-step:finalize-usage")
    .addEdge("log-step:finalize-usage", "finalize-usage")
    .addEdge("finalize-usage", "__end__");

  return sg.compile({ checkpointer: deps.checkpointer }) as unknown as ReturnType<
    CompiledGraphFactory
  >;
};
