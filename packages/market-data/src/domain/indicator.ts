/**
 * @openbulls/market-data — `Indicator` value object.
 *
 * Technical indicator output. Two shapes are supported:
 *
 *  - **Scalar** — single value per time point (RSI, SMA, EMA). Use
 *    `series` with one entry per bar.
 *
 *  - **Multi-line** — multiple lines per time point (MACD has
 *    macd/signal/histogram, Bollinger has upper/middle/lower).
 *    `series[i].values` carries the keyed numbers.
 *
 * `params` records the configuration that produced this series so
 * downstream layers can reconstruct the computation.
 */
import type { AssetSymbol, IndicatorType, Interval, ProviderName } from "./brands";

export interface IndicatorPoint {
  readonly asOf: Date;
  /** Single-value indicators use `value`; multi-line ones populate `values`. */
  readonly value: number | null;
  readonly values: Readonly<Record<string, number>> | null;
}

export interface Indicator {
  readonly symbol: AssetSymbol;
  readonly type: IndicatorType;
  readonly interval: Interval;
  readonly asOf: Date;
  readonly params: Readonly<Record<string, number>>;
  readonly series: readonly IndicatorPoint[];
  readonly provider: ProviderName;
}
