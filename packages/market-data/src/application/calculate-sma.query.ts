/**
 * @openbulls/market-data — `calculateSma` query.
 *
 * Simple Moving Average — equal-weight mean of the last `period`
 * closes. Cheapest indicator; uses the smallest lookback (= period
 * itself is enough).
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
import { calculateSMA } from "../domain/indicators/sma";
import type { IIndicatorCache } from "../domain/ports/cache.port";
import { type GetCandlesDeps, getCandles } from "./get-candles.query";

export interface CalculateSmaDeps extends GetCandlesDeps {
  readonly indicatorCache: IIndicatorCache;
  readonly now: () => Date;
}

export interface CalculateSmaInput {
  readonly symbol: AssetSymbol;
  readonly interval: Interval;
  /** Window size in candles. Default 20. */
  readonly period?: number;
  /** Lookback window of recent candles. Default = period * 3. */
  readonly lookback?: number;
}

export async function calculateSma(
  deps: CalculateSmaDeps,
  input: CalculateSmaInput,
): Promise<Result<Indicator, MarketDataError>> {
  const period = input.period ?? 20;
  const lookback = input.lookback ?? period * 3;
  const now = deps.now();

  const indicatorKey = "sma" as IndicatorType;
  const cached = await deps.indicatorCache.read({
    symbol: input.symbol,
    type: indicatorKey,
    interval: input.interval,
  });
  if (!cached.ok) return cached;
  if (cached.value !== null) return ok(cached.value);

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

  const candles = candlesResult.value;
  const closes = candles.map((c) => c.close);
  const smaSeries = calculateSMA(closes, period);
  const offset = closes.length - smaSeries.length;
  const points: IndicatorPoint[] = smaSeries.map((value, i) => {
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
