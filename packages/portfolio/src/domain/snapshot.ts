/**
 * @openbulls/portfolio — PortfolioSnapshot VO (overview output).
 *
 * Returned by `get-portfolio-overview.query.ts`. Bundles portfolio
 * metadata, all current positions (FX-adjusted), and aggregated
 * totals in the portfolio's base currency.
 *
 * `asOf` is the snapshot timestamp — typically `now()` at query
 * time; market data inside `positions[]` may be slightly older
 * depending on cache freshness.
 */
import type { Portfolio } from "./portfolio";
import type { Position } from "./position";
import type { Money, Currency } from "./brands";

export interface PortfolioTotals {
  readonly totalCost: Money;
  readonly totalMarketValue: Money | null;
  readonly totalUnrealizedPnl: Money | null;
  readonly totalRealizedPnl: Money;
  readonly baseCurrency: Currency;
  readonly asOf: Date;
}

export interface PortfolioSnapshot {
  readonly portfolio: Portfolio;
  readonly positions: readonly Position[];
  readonly totals: PortfolioTotals;
}