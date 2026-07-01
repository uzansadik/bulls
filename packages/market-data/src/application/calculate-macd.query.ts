/**
 * @openbulls/market-data — `calculateMacd` query.
 *
 * MACD (Moving Average Convergence Divergence) — three exponential
 * moving averages: `macd` (fast − slow), `signal` (EMA of macd),
 * `histogram` (macd − signal). Pure calculation lives in
 * `domain/indicators/macd`; this query fetches candles via the
 * cache-first flow and writes the result to the indicator cache.
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
import { calculateMACD } from "../domain/indicators/macd";
import type { IIndicatorCache } from "../domain/ports/cache.port";
import { type GetCandlesDeps, getCandles } from "./get-candles.query";

export interface CalculateMacdDeps extends GetCandlesDeps {
  readonly indicatorCache: IIndicatorCache;
  readonly now: () => Date;
}

export interface CalculateMacdInput {
  readonly symbol: AssetSymbol;
  readonly interval: Interval;
  /** Fast EMA period. Default 12. */
  readonly fast?: number;
  /** Slow EMA period. Default 26. */
  readonly slow?: number;
  /** Signal EMA period. Default 9. */
  readonly signal?: number;
  /** Lookback window of recent candles. Default 300. */
  readonly lookback?: number;
}

export async function calculateMacd(
  deps: CalculateMacdDeps,
  input: CalculateMacdInput,
): Promise<Result<Indicator, MarketDataError>> {
  const fast = input.fast ?? 12;
  const slow = input.slow ?? 26;
  const signal = input.signal ?? 9;
  const lookback = input.lookback ?? 300;
  const now = deps.now();

  const indicatorKey = "macd" as IndicatorType;
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
  const macd = calculateMACD(closes, fast, slow, signal);
  const offset = closes.length - macd.macd.length;
  const points: IndicatorPoint[] = macd.macd.map((value, i) => {
    const candle = candles[offset + i];
    return {
      asOf: candle?.closeTime ?? now,
      value,
      values: { macd: value, signal: macd.signal[i] ?? 0, histogram: macd.histogram[i] ?? 0 },
    };
  });

  const indicator: Indicator = {
    symbol: input.symbol,
    type: indicatorKey,
    interval: input.interval,
    asOf: now,
    params: { fast, slow, signal, lookback },
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
