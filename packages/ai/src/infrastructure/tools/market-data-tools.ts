import {
  Interval,
  type MarketDataDeps,
  calculateMacd,
  calculateRsi,
  calculateSma,
  getCandles,
  getFinancialRatios,
  getFxRate,
  getNews,
  getQuote,
} from "@openbulls/market-data";
import { isOk } from "@openbulls/shared";
/**
 * @openbulls/ai — infrastructure: market-data tools.
 *
 * Six AI-callable tools that wrap the `@openbulls/market-data`
 * application layer:
 *
 *   - get-delayed-price         (read) — wraps `getQuote`
 *   - get-price-history         (read) — wraps `getCandles`
 *   - get-fx-rate               (read)
 *   - get-technical-indicators  (read) — SMA + RSI + MACD, indicator param
 *   - get-financial-ratios      (read)
 *   - search-market-news        (read) — wraps `getNews`
 *
 * Each factory takes `MarketDataDeps` (already bound to caches + a
 * provider router by the composition root) and returns a `ToolSpec`.
 */
import { z } from "zod";

import type { ToolSpec } from "../../domain/tool/tool-spec";

/**
 * Latest available quote for a single symbol. Defaults to a 60-second
 * freshness window — callers can override when they need near-real-
 * time prices.
 */
export function makeGetDelayedPriceTool(deps: MarketDataDeps): ToolSpec<z.ZodTypeAny> {
  return {
    name: "get-delayed-price",
    description:
      "Fetch the latest available quote for a single symbol. Pass maxAgeMs to override the default freshness window.",
    schema: z.object({
      symbol: z.string().min(1).describe("Ticker symbol, e.g. THYAO."),
      maxAgeMs: z.number().int().positive().optional(),
    }),
    permission: "read",
    meta: { source: "market-data" },
    execute: async (args) => {
      const input = args as { symbol: string; maxAgeMs?: number };
      const result = await getQuote(deps, {
        symbol: input.symbol as never,
        ...(input.maxAgeMs !== undefined ? { maxAgeMs: input.maxAgeMs } : {}),
      });
      return isOk(result) ? result.value : { error: result.error.message };
    },
  };
}

/**
 * Historical candle series over a date window. The interval is
 * branded so the model must send a recognised cadence (1d, 1h, …).
 */
export function makeGetPriceHistoryTool(deps: MarketDataDeps): ToolSpec<z.ZodTypeAny> {
  return {
    name: "get-price-history",
    description:
      "Fetch historical OHLC candles for a symbol over a date window. interval ∈ {1m,5m,15m,1h,4h,1d,1w,1mo}.",
    schema: z.object({
      symbol: z.string().min(1),
      interval: z.string().min(1).describe("Cadence, e.g. '1d'."),
      from: z.string().datetime(),
      to: z.string().datetime(),
      adjusted: z.boolean().optional(),
    }),
    permission: "read",
    meta: { source: "market-data" },
    execute: async (args) => {
      const input = args as {
        symbol: string;
        interval: string;
        from: string;
        to: string;
        adjusted?: boolean;
      };
      const result = await getCandles(deps, {
        symbol: input.symbol as never,
        interval: Interval(input.interval as never),
        from: new Date(input.from),
        to: new Date(input.to),
        ...(input.adjusted !== undefined ? { adjusted: input.adjusted } : {}),
      });
      return isOk(result) ? result.value : { error: result.error.message };
    },
  };
}

/**
 * FX rate between two currencies.
 */
export function makeGetFxRateTool(deps: MarketDataDeps): ToolSpec<z.ZodTypeAny> {
  return {
    name: "get-fx-rate",
    description:
      "Fetch the FX rate between two ISO 4217 currencies. Returns the rate such that `1 base = rate quote`.",
    schema: z.object({
      base: z.string().length(3),
      quote: z.string().length(3),
      asOf: z.string().datetime().optional(),
    }),
    permission: "read",
    meta: { source: "market-data" },
    execute: async (args) => {
      const input = args as { base: string; quote: string; asOf?: string };
      const result = await getFxRate(deps, {
        base: input.base as never,
        quote: input.quote as never,
        ...(input.asOf !== undefined ? { asOf: new Date(input.asOf) } : {}),
      });
      return isOk(result) ? result.value : { error: result.error.message };
    },
  };
}

/**
 * Compute a single technical indicator. `indicator` selects the
 * underlying query (`rsi`, `macd`, `sma`); extra fields are
 * optional and only used by their indicator.
 */
export function makeGetTechnicalIndicatorsTool(deps: MarketDataDeps): ToolSpec<z.ZodTypeAny> {
  return {
    name: "get-technical-indicators",
    description:
      "Compute a single technical indicator (RSI, MACD, or SMA). Returned as a series keyed by timestamp.",
    schema: z.object({
      symbol: z.string().min(1),
      interval: z.string().min(1),
      indicator: z.enum(["rsi", "macd", "sma"]),
      period: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Indicator period (default 14 for RSI, 20 for SMA)."),
      fast: z.number().int().positive().optional().describe("MACD fast EMA."),
      slow: z.number().int().positive().optional().describe("MACD slow EMA."),
      signal: z.number().int().positive().optional().describe("MACD signal EMA."),
    }),
    permission: "read",
    meta: { source: "market-data" },
    execute: async (args) => {
      const input = args as {
        symbol: string;
        interval: string;
        indicator: "rsi" | "macd" | "sma";
        period?: number;
        fast?: number;
        slow?: number;
        signal?: number;
      };
      const symbol = input.symbol as never;
      const interval = Interval(input.interval as never);
      switch (input.indicator) {
        case "rsi": {
          const r = await calculateRsi(deps, {
            symbol,
            interval,
            ...(input.period !== undefined ? { period: input.period } : {}),
          });
          return isOk(r) ? r.value : { error: r.error.message };
        }
        case "macd": {
          const r = await calculateMacd(deps, {
            symbol,
            interval,
            ...(input.fast !== undefined ? { fast: input.fast } : {}),
            ...(input.slow !== undefined ? { slow: input.slow } : {}),
            ...(input.signal !== undefined ? { signal: input.signal } : {}),
          });
          return isOk(r) ? r.value : { error: r.error.message };
        }
        case "sma": {
          const r = await calculateSma(deps, {
            symbol,
            interval,
            ...(input.period !== undefined ? { period: input.period } : {}),
          });
          return isOk(r) ? r.value : { error: r.error.message };
        }
      }
    },
  };
}

/**
 * Derived ratios (P/E, ROE, D/E, …) for a symbol.
 */
export function makeGetFinancialRatiosTool(deps: MarketDataDeps): ToolSpec<z.ZodTypeAny> {
  return {
    name: "get-financial-ratios",
    description:
      "Fetch derived financial ratios (P/E, P/B, ROE, debt/equity, ...) for a symbol. `period` ∈ {quarterly, annual}.",
    schema: z.object({
      symbol: z.string().min(1),
      period: z.enum(["quarterly", "annual"]),
      limit: z.number().int().positive().max(40).optional(),
    }),
    permission: "read",
    meta: { source: "market-data" },
    execute: async (args) => {
      const input = args as { symbol: string; period: "quarterly" | "annual"; limit?: number };
      const result = await getFinancialRatios(deps, {
        symbol: input.symbol as never,
        period: input.period,
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
      });
      return isOk(result) ? result.value : { error: result.error.message };
    },
  };
}

/**
 * Recent news for a symbol (or, if absent, general market news).
 */
export function makeSearchMarketNewsTool(deps: MarketDataDeps): ToolSpec<z.ZodTypeAny> {
  return {
    name: "search-market-news",
    description:
      "Search recent market news, optionally filtered by symbol. from/to are ISO 8601 timestamps.",
    schema: z.object({
      symbol: z.string().min(1).optional(),
      from: z.string().datetime(),
      to: z.string().datetime(),
      limit: z.number().int().positive().max(100).optional(),
    }),
    permission: "read",
    meta: { source: "market-data" },
    execute: async (args) => {
      const input = args as {
        symbol?: string;
        from: string;
        to: string;
        limit?: number;
      };
      const result = await getNews(deps, {
        ...(input.symbol !== undefined ? { symbol: input.symbol as never } : {}),
        from: new Date(input.from),
        to: new Date(input.to),
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
      });
      return isOk(result) ? result.value : { error: result.error.message };
    },
  };
}

/**
 * Convenience aggregator.
 */
export function makeMarketDataTools(deps: MarketDataDeps): ReadonlyArray<ToolSpec<z.ZodTypeAny>> {
  return [
    makeGetDelayedPriceTool(deps),
    makeGetPriceHistoryTool(deps),
    makeGetFxRateTool(deps),
    makeGetTechnicalIndicatorsTool(deps),
    makeGetFinancialRatiosTool(deps),
    makeSearchMarketNewsTool(deps),
  ];
}
