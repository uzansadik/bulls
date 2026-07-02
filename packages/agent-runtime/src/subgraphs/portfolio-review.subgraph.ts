import { ToolCallFailedError } from "../domain/errors";
import { type GraphDefinition, GraphKey } from "../domain/graph";
import { defineNode } from "../domain/nodes";
/**
 * @openbulls/agent-runtime — portfolio-review subgraph.
 *
 * Five-step pipeline that produces a markdown portfolio health report:
 *
 *   1. load-portfolio         — portfolio.getPortfolioOverview
 *   2. calculate-performance   — portfolio.getPortfolioPerformance
 *   3. risk-flags             — concentration / drawdown heuristic
 *   4. recommendations        — allocation / rebalancing suggestions
 *   5. synthesize-report      — markdown draft assembly
 *
 * Downstream consumers (chat surface, weekly email digest, report
 * writer) render from `state.scratchpad.report`. Each node keeps its
 * intermediate output on the scratchpad so future re-runs can audit
 * the analysis chain.
 */
import type { AgentRunState } from "../domain/state";
import { logStep } from "../nodes/log-step.node";

/** Subgraph-specific state extension. */
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
  readonly recommendations?: ReadonlyArray<{
    readonly title: string;
    readonly rationale: string;
  }>;
  readonly report?: string;
}

export type PortfolioReviewState = AgentRunState & PortfolioReviewScratchpad;

/**
 * Cast the base-state scratchpad to the typed subgraph shape. See
 * company-analysis.subgraph.ts for the same pattern.
 */
function pad(state: PortfolioReviewState): PortfolioReviewScratchpad {
  return state.scratchpad as unknown as PortfolioReviewScratchpad;
}

/** Input payload for the subgraph. */
export interface PortfolioReviewInput {
  readonly portfolioId: string;
  /** Optional ISO date range; defaults to last 90 days. */
  readonly from?: string;
  readonly to?: string;
  readonly estimatedCostUsd?: string;
}

// ─── Nodes ────────────────────────────────────────────────────────────────────

const loadPortfolio = defineNode<PortfolioReviewState>({
  name: "load-portfolio",
  async run(state, deps) {
    const portfolio = deps.portfolio;
    if (!portfolio) {
      throw new ToolCallFailedError("portfolio", "gateway missing from deps");
    }
    const scratch = pad(state);
    const overview = await portfolio.getPortfolioOverview({
      portfolioId: scratch.portfolioId,
    });
    deps.logger.info("portfolio-review: overview loaded", {
      runId: state.runId,
      portfolioId: scratch.portfolioId,
    });
    return {
      scratchpad: { ...scratch, overview },
      currentNode: "load-portfolio",
    };
  },
});

const calculatePerformance = defineNode<PortfolioReviewState>({
  name: "calculate-performance",
  async run(state, deps) {
    const portfolio = deps.portfolio;
    if (!portfolio) {
      throw new ToolCallFailedError("portfolio", "gateway missing from deps");
    }
    const scratch = pad(state);
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
      scratchpad: { ...scratch, performance },
      currentNode: "calculate-performance",
    };
  },
});

const riskFlags = defineNode<PortfolioReviewState>({
  name: "risk-flags",
  async run(state, _deps) {
    const scratch = pad(state);
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
        ...scratch,
        riskFlags: { concentration, drawdownPct, insights },
      },
      currentNode: "risk-flags",
    };
  },
});

const recommendations = defineNode<PortfolioReviewState>({
  name: "recommendations",
  async run(state, _deps) {
    const scratch = pad(state);
    const out: Array<{ title: string; rationale: string }> = [];
    const flags = scratch.riskFlags;
    if (!flags) {
      return {
        scratchpad: { ...scratch, recommendations: out },
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
      scratchpad: { ...scratch, recommendations: out },
      currentNode: "recommendations",
    };
  },
});

const synthesizeReport = defineNode<PortfolioReviewState>({
  name: "synthesize-portfolio-review",
  async run(state, deps) {
    const scratch = pad(state);
    const parts: string[] = [];
    parts.push(`# Portfolio Review: ${scratch.portfolioId}`);
    parts.push("");
    if (scratch.riskFlags) {
      parts.push("## Risk Flags");
      for (const line of scratch.riskFlags.insights) {
        parts.push(`- ${line}`);
      }
      parts.push("");
    }
    if (scratch.recommendations) {
      parts.push("## Recommendations");
      for (const r of scratch.recommendations) {
        parts.push(`### ${r.title}`);
        parts.push(r.rationale);
        parts.push("");
      }
    }
    const report = parts.join("\n");
    deps.logger.info("portfolio-review: report synthesized", {
      runId: state.runId,
      portfolioId: scratch.portfolioId,
      length: report.length,
    });
    return {
      scratchpad: { ...scratch, report },
      currentNode: "synthesize-portfolio-review",
    };
  },
});

// ─── Graph definition ────────────────────────────────────────────────────────

export const portfolioReviewGraph: GraphDefinition<PortfolioReviewState> = {
  key: GraphKey("portfolio-review"),
  description:
    "Portfolio health report — overview + performance + risk flags + rebalancing recommendations",
  buildState: ({ runId, threadId, userId, input }) => {
    const payload = (input ?? {}) as Partial<PortfolioReviewInput>;
    if (!payload.portfolioId) {
      throw new Error("portfolio-review requires { portfolioId } input");
    }
    const base: AgentRunState = {
      runId,
      threadId,
      userId,
      graphKey: "portfolio-review",
      status: "running",
      startedAt: new Date().toISOString(),
      messages: [],
      scratchpad: {},
      toolInvocations: [],
      ...(payload.estimatedCostUsd ? { budget: { estimatedCost: payload.estimatedCostUsd } } : {}),
    };
    const extension: PortfolioReviewScratchpad = {
      portfolioId: payload.portfolioId,
      ...(payload.from ? { from: payload.from } : {}),
      ...(payload.to ? { to: payload.to } : {}),
    };
    return { ...base, ...extension } as PortfolioReviewState;
  },
  nodes: [
    logStep({ stepKey: "load-portfolio" }),
    loadPortfolio,
    logStep({ stepKey: "calculate-performance" }),
    calculatePerformance,
    logStep({ stepKey: "risk-flags" }),
    riskFlags,
    logStep({ stepKey: "recommendations" }),
    recommendations,
    logStep({ stepKey: "synthesize-portfolio-review" }),
    synthesizeReport,
  ],
  idempotentNodes: new Set([
    "log-step:load-portfolio",
    "log-step:calculate-performance",
    "log-step:risk-flags",
    "log-step:recommendations",
    "log-step:synthesize-portfolio-review",
  ]),
};
