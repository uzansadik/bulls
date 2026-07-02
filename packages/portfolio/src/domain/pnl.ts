/**
 * @openbulls/portfolio — PnL aggregates.
 *
 * Two layers of PnL:
 *
 *   - `RealizedPnl` — locked-in gains/losses from sells, dividends,
 *     and transfers. Already in `Holding.realizedPnl`.
 *   - `UnrealizedPnl` — mark-to-market gap between `avgCost` and
 *     current `marketPrice` for the open quantity. Computed at
 *     query time in `get-portfolio-overview.query.ts`.
 *
 * `PerformanceSnapshot` rolls both together with the time-weighted
 * return metrics. See `domain/services/performance.ts`.
 */
import type { Money, Currency } from "./brands";

export interface RealizedPnl {
  readonly amount: Money;
  readonly currency: Currency;
}

export interface UnrealizedPnl {
  readonly amount: Money;
  readonly currency: Currency;
}

export interface Cashflow {
  readonly at: Date;
  readonly amount: Money;
  readonly currency: Currency;
}

export interface EquityPoint {
  readonly asOf: Date;
  readonly value: Money;
  readonly currency: Currency;
}

export interface PerformanceSnapshot {
  readonly totalReturn: number;
  readonly timeWeightedReturn: number;
  readonly maxDrawdown: number;
  readonly realizedPnl: Money;
  readonly unrealizedPnl: Money;
  readonly baseCurrency: Currency;
  readonly from: Date;
  readonly to: Date;
  readonly maxDrawdownWindow: { peak: Date; trough: Date } | null;
}