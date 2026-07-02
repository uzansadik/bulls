import {
  type MarketDataDeps,
  StatementType,
  getFinancialRatios,
  getFinancialStatements,
} from "@openbulls/market-data";
import { isOk } from "@openbulls/shared";
/**
 * @openbulls/ai — infrastructure: financials tools.
 *
 * Five AI-callable tools focused on company financial statements:
 *
 *   - get-financial-statement   (read) — generic statement by type
 *   - get-income-statement      (read) — convenience wrapper for `statementType: income-statement`
 *   - get-balance-sheet         (read) — convenience wrapper for `statementType: balance-sheet`
 *   - get-cash-flow             (read) — convenience wrapper for `statementType: cash-flow`
 *   - analyze-financial-statement (read) — combines a statement with its ratios for a one-shot read
 *
 * `getFinancialStatements` from `@openbulls/market-data` is the
 * single underlying query; the three statement-specific tools are
 * thin presets so the model can pick a verb it understands without
 * having to learn the `statementType` enum up front.
 */
import { z } from "zod";

import type { ToolSpec } from "../../domain/tool/tool-spec";

const statementSchema = z.object({
  symbol: z.string().min(1),
  period: z.enum(["quarterly", "annual"]).default("annual"),
  limit: z.number().int().positive().max(40).optional(),
});

type StatementArgs = {
  symbol: string;
  period: "quarterly" | "annual";
  limit?: number;
};

/**
 * Resolve a `StatementType` from a free-form argument. Accepts the
 * human-friendly form the model is likely to send.
 */
function resolveStatementType(raw: string): StatementType {
  const normalised = raw.trim().toLowerCase().replace(/[ _]+/g, "-");
  return StatementType(normalised as never);
}

/**
 * Generic statement fetch — the model picks `statementType`.
 */
export function makeGetFinancialStatementTool(deps: MarketDataDeps): ToolSpec<z.ZodTypeAny> {
  return {
    name: "get-financial-statement",
    description:
      "Fetch a financial statement series by type. `statementType` ∈ {income-statement, balance-sheet, cash-flow, comprehensive-income, ...}.",
    schema: statementSchema.extend({
      statementType: z
        .string()
        .min(1)
        .describe(
          "Free-form statement type, e.g. 'income-statement', 'balance-sheet', 'cash-flow'.",
        ),
    }),
    permission: "read",
    meta: { source: "financials" },
    execute: async (args) => {
      const input = args as StatementArgs & { statementType: string };
      const result = await getFinancialStatements(deps, {
        symbol: input.symbol as never,
        statementType: resolveStatementType(input.statementType),
        period: input.period,
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
      });
      return isOk(result) ? result.value : { error: result.error.message };
    },
  };
}

/**
 * Convenience wrapper that pins `statementType` to "income-statement".
 */
export function makeGetIncomeStatementTool(deps: MarketDataDeps): ToolSpec<z.ZodTypeAny> {
  return {
    name: "get-income-statement",
    description: "Fetch the income statement series for a symbol.",
    schema: statementSchema,
    permission: "read",
    meta: { source: "financials" },
    execute: async (args) => {
      const input = args as StatementArgs;
      const result = await getFinancialStatements(deps, {
        symbol: input.symbol as never,
        statementType: resolveStatementType("income-statement"),
        period: input.period,
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
      });
      return isOk(result) ? result.value : { error: result.error.message };
    },
  };
}

/**
 * Convenience wrapper that pins `statementType` to "balance-sheet".
 */
export function makeGetBalanceSheetTool(deps: MarketDataDeps): ToolSpec<z.ZodTypeAny> {
  return {
    name: "get-balance-sheet",
    description: "Fetch the balance sheet series for a symbol.",
    schema: statementSchema,
    permission: "read",
    meta: { source: "financials" },
    execute: async (args) => {
      const input = args as StatementArgs;
      const result = await getFinancialStatements(deps, {
        symbol: input.symbol as never,
        statementType: resolveStatementType("balance-sheet"),
        period: input.period,
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
      });
      return isOk(result) ? result.value : { error: result.error.message };
    },
  };
}

/**
 * Convenience wrapper that pins `statementType` to "cash-flow".
 */
export function makeGetCashFlowTool(deps: MarketDataDeps): ToolSpec<z.ZodTypeAny> {
  return {
    name: "get-cash-flow",
    description: "Fetch the cash-flow statement series for a symbol.",
    schema: statementSchema,
    permission: "read",
    meta: { source: "financials" },
    execute: async (args) => {
      const input = args as StatementArgs;
      const result = await getFinancialStatements(deps, {
        symbol: input.symbol as never,
        statementType: resolveStatementType("cash-flow"),
        period: input.period,
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
      });
      return isOk(result) ? result.value : { error: result.error.message };
    },
  };
}

/**
 * Combine a statement (income) + ratios into a single payload the
 * model can summarise. This is a deliberate synthesis step —
 * pulling both queries in one tool call is cheaper than two turns.
 */
export function makeAnalyzeFinancialStatementTool(deps: MarketDataDeps): ToolSpec<z.ZodTypeAny> {
  return {
    name: "analyze-financial-statement",
    description:
      "Pull a financial statement together with its derived ratios in a single round trip. Useful for a one-shot health read.",
    schema: z.object({
      symbol: z.string().min(1),
      statementType: z.string().min(1).default("income-statement"),
      period: z.enum(["quarterly", "annual"]).default("annual"),
      limit: z.number().int().positive().max(40).optional(),
    }),
    permission: "read",
    meta: { source: "financials" },
    execute: async (args) => {
      const input = args as {
        symbol: string;
        statementType: string;
        period: "quarterly" | "annual";
        limit?: number;
      };
      const [statementsResult, ratiosResult] = await Promise.all([
        getFinancialStatements(deps, {
          symbol: input.symbol as never,
          statementType: resolveStatementType(input.statementType),
          period: input.period,
          ...(input.limit !== undefined ? { limit: input.limit } : {}),
        }),
        getFinancialRatios(deps, {
          symbol: input.symbol as never,
          period: input.period,
          ...(input.limit !== undefined ? { limit: input.limit } : {}),
        }),
      ]);
      return {
        statement: isOk(statementsResult)
          ? statementsResult.value
          : { error: statementsResult.error.message },
        ratios: isOk(ratiosResult) ? ratiosResult.value : { error: ratiosResult.error.message },
      };
    },
  };
}

/**
 * Convenience aggregator.
 */
export function makeFinancialsTools(deps: MarketDataDeps): ReadonlyArray<ToolSpec<z.ZodTypeAny>> {
  return [
    makeGetFinancialStatementTool(deps),
    makeGetIncomeStatementTool(deps),
    makeGetBalanceSheetTool(deps),
    makeGetCashFlowTool(deps),
    makeAnalyzeFinancialStatementTool(deps),
  ];
}
