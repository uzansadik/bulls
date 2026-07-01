/**
 * @openbulls/market-data — `calculateRsi` query.
 *
 * Pulls candles through the cache-first `getCandles` flow and applies
 * the pure `calculateRSI` (Wilder smoothing) function from
 * `domain/indicators/rsi`. The result is written to the indicator
 * cache so subsequent calls within 24h skip the candle fetch.
 */
import { type Result, ok } from "@openbulls/shared";
import {
  type AssetSymbol,
  type IndicatorType,
  type Interval,
  ProviderName,
} from "../domain/brands";
import type { MarketDataError } from "../domain/errors";
import type { Indicator, IndicatorPoint } from "../domain/indicator";
import { calculateRSI } from "../domain/indicators/rsi";
import type { IIndicatorCache } from "../domain/ports/cache.port";
import { type GetCandlesDeps, getCandles } from "./get-candles.query";

export interface CalculateRsiDeps extends GetCandlesDeps {
  readonly indicatorCache: IIndicatorCache;
  readonly now: () => Date;
}

export interface CalculateRsiInput {
  readonly symbol: AssetSymbol;
  readonly interval: Interval;
  /** Window size in candles. Default 14. */
  readonly period?: number;
  /** Lookback window of recent candles to compute RSI over. Default 200. */
  readonly lookback?: number;
}

export async function calculateRsi(
  deps: CalculateRsiDeps,
  input: CalculateRsiInput,
): Promise<Result<Indicator, MarketDataError>> {
  const period = input.period ?? 14;
  const lookback = input.lookback ?? 200;
  const now = deps.now();

  // 1) Try indicator cache.
  const indicatorKey = "rsi" as IndicatorType;
  const cached = await deps.indicatorCache.read({
    symbol: input.symbol,
    type: indicatorKey,
    interval: input.interval,
  });
  if (!cached.ok) return cached;
  if (cached.value !== null) return ok(cached.value);

  // 2) Fetch enough candles (most-recent `lookback`).
  const to = now;
  const fromMs = to.getTime() - lookback * intervalToMs(input.interval);
  const from = new Date(fromMs);
  const candlesResult = await getCandles(deps, {
    symbol: input.symbol,
    interval: input.interval,
    from,
    to,
  });
  if (!candlesResult.ok) return candlesResult;

  // 3) Compute RSI on close prices; align with candle timestamps.
  const candles = candlesResult.value;
  const closes = candles.map((c) => c.close);
  const rsiSeries = calculateRSI(closes, period);
  const offset = closes.length - rsiSeries.length;
  const points: IndicatorPoint[] = rsiSeries.map((value, i) => {
    const candle = candles[offset + i];
    return {
      asOf: candle?.closeTime ?? now,
      value,
      values: null,
    };
  });

  const indicator: Indicator = {
    symbol: input.symbol,
    type: indicatorKey,
    interval: input.interval,
    asOf: now,
    params: { period, lookback },
    series: points,
    provider: ProviderName("mock"),
  };

  // 4) Cache it.
  const writeResult = await deps.indicatorCache.write({ indicator });
  if (!writeResult.ok) return ok(indicator);

  return ok(indicator);
}

function intervalToMs(interval: Interval): number {
  switch (String(interval)) {
    case "1m":
      return 60 * 1000;
    case "5m":
      return 5 * 60 * 1000;
    case "15m":
      return 15 * 60 * 1000;
    case "30m":
      return 30 * 60 * 1000;
    case "1h":
      return 60 * 60 * 1000;
    case "4h":
      return 4 * 60 * 60 * 1000;
    case "1d":
      return 24 * 60 * 60 * 1000;
    case "1w":
      return 7 * 24 * 60 * 60 * 1000;
    case "1mo":
      return 30 * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
}
