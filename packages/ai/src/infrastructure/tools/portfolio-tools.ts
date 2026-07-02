import {
  type PortfolioDeps,
  addTransaction,
  getHoldings,
  getPortfolioOverview,
  getPortfolioPerformance,
} from "@openbulls/portfolio";
import { isOk } from "@openbulls/shared";
/**
 * @openbulls/ai — infrastructure: portfolio tools.
 *
 * Four AI-callable tools that wrap the `@openbulls/portfolio`
 * application layer:
 *
 *   - add-transaction          (write,  destructive — requires approval)
 *   - get-portfolio-overview   (read)
 *   - get-positions            (read) — wraps `getHoldings`
 *   - calculate-portfolio-health (read) — wraps `getPortfolioPerformance`
 *
 * Each factory takes the fully-bound `PortfolioDeps` and returns a
 * `ToolSpec` ready for `ToolRegistry.register`. The execute body is a
 * one-line wrapper around the package command/query — no business
 * logic here. `Result` from `@openbulls/shared` is unwrapped via
 * `isOk` so the model always sees a plain JSON payload.
 */
import { z } from "zod";

import type { ToolSpec } from "../../domain/tool/tool-spec";

/**
 * Add a buy/sell transaction to a portfolio. The selector never
 * attaches this tool automatically; it only fires when the user
 * has explicitly opted into a write-mode toggle.
 */
export function makeAddTransactionTool(deps: PortfolioDeps): ToolSpec<z.ZodTypeAny> {
  return {
    name: "add-transaction",
    description:
      "Add a buy or sell transaction to a portfolio. Requires explicit user confirmation; do not call from speculative turns.",
    schema: z.object({
      portfolioId: z.string().min(1).describe("Portfolio id the transaction belongs to."),
      assetSymbol: z.string().min(1).describe("Ticker symbol, e.g. THYAO."),
      side: z.enum(["buy", "sell"]).describe("Transaction direction."),
      quantity: z.number().positive().describe("Number of shares / units."),
      unitPrice: z.number().nonnegative().describe("Price per unit in the given currency."),
      currency: z.string().length(3).describe("ISO 4217 currency code, e.g. TRY."),
      fees: z.number().nonnegative().optional().describe("Brokerage / transaction fees."),
      executedAt: z
        .string()
        .datetime()
        .optional()
        .describe("ISO 8601 execution timestamp; defaults to now."),
      notes: z.string().max(500).optional(),
    }),
    permission: "destructive",
    meta: { source: "portfolio" },
    execute: async (args) => {
      const input = args as {
        portfolioId: string;
        assetSymbol: string;
        side: "buy" | "sell";
        quantity: number;
        unitPrice: number;
        currency: string;
        fees?: number;
        executedAt?: string;
        notes?: string;
      };
      const result = await addTransaction(deps, {
        portfolioId: input.portfolioId,
        assetSymbol: input.assetSymbol,
        side: input.side,
        quantity: String(input.quantity),
        unitPrice: String(input.unitPrice),
        currency: input.currency,
        executedAt: input.executedAt !== undefined ? new Date(input.executedAt) : new Date(),
        ...(input.fees !== undefined ? { fees: String(input.fees) } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      });
      return isOk(result) ? result.value : { error: result.error.message };
    },
  };
}

/**
 * Read-only: fetch the full overview (totals + per-position snapshot)
 * for a portfolio.
 */
export function makeGetPortfolioOverviewTool(deps: PortfolioDeps): ToolSpec<z.ZodTypeAny> {
  return {
    name: "get-portfolio-overview",
    description:
      "Fetch the portfolio overview — base currency, current holdings FX-adjusted to base, totals (market value, unrealized P&L).",
    schema: z.object({
      portfolioId: z.string().min(1),
    }),
    permission: "read",
    meta: { source: "portfolio" },
    execute: async (args) => {
      const result = await getPortfolioOverview(deps, args as { portfolioId: string });
      return isOk(result) ? result.value : { error: result.error.message };
    },
  };
}

/**
 * Read-only: list current positions (quantity + cost basis) for a
 * portfolio. This wraps `getHoldings` — the portfolio package does
 * not expose a separate "positions" concept.
 */
export function makeGetPositionsTool(deps: PortfolioDeps): ToolSpec<z.ZodTypeAny> {
  return {
    name: "get-positions",
    description:
      "List the current positions in a portfolio (asset symbol, quantity, average cost, realized P&L, currency).",
    schema: z.object({
      portfolioId: z.string().min(1),
      includeZero: z.boolean().optional().describe("When true, include zero-quantity positions."),
    }),
    permission: "read",
    meta: { source: "portfolio" },
    execute: async (args) => {
      const input = args as { portfolioId: string; includeZero?: boolean };
      const result = await getHoldings(deps, {
        portfolioId: input.portfolioId,
        ...(input.includeZero !== undefined ? { includeZero: input.includeZero } : {}),
      });
      return isOk(result) ? result.value : { error: result.error.message };
    },
  };
}

/**
 * Read-only: compute the portfolio's total return / time-weighted
 * return / max drawdown over a window. Wraps `getPortfolioPerformance`.
 */
export function makeCalculatePortfolioHealthTool(deps: PortfolioDeps): ToolSpec<z.ZodTypeAny> {
  return {
    name: "calculate-portfolio-health",
    description:
      "Calculate portfolio performance metrics (total return, time-weighted return, max drawdown) for a given date range.",
    schema: z.object({
      portfolioId: z.string().min(1),
      from: z.string().datetime().describe("ISO 8601 start of the window."),
      to: z.string().datetime().describe("ISO 8601 end of the window."),
      baseCurrency: z.string().length(3).optional(),
    }),
    permission: "read",
    meta: { source: "portfolio" },
    execute: async (args) => {
      const input = args as {
        portfolioId: string;
        from: string;
        to: string;
        baseCurrency?: string;
      };
      const result = await getPortfolioPerformance(deps, {
        portfolioId: input.portfolioId,
        from: new Date(input.from),
        to: new Date(input.to),
        ...(input.baseCurrency !== undefined ? { baseCurrency: input.baseCurrency } : {}),
      });
      return isOk(result) ? result.value : { error: result.error.message };
    },
  };
}

/**
 * Convenience aggregator: every portfolio tool in registration
 * order. Used by the default tool registry factory.
 */
export function makePortfolioTools(deps: PortfolioDeps): ReadonlyArray<ToolSpec<z.ZodTypeAny>> {
  return [
    makeAddTransactionTool(deps),
    makeGetPortfolioOverviewTool(deps),
    makeGetPositionsTool(deps),
    makeCalculatePortfolioHealthTool(deps),
  ];
}
