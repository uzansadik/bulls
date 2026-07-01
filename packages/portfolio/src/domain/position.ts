/**
 * @openbulls/portfolio — Position VO (holding enriched with market data).
 *
 * A `Position` is the read-side projection of a `Holding` plus the
 * latest market price and an FX-adjusted market value. It is never
 * persisted — it's built on the fly by `get-portfolio-overview.query.ts`
 * from a `Holding` and a `Quote` + `FxRate`.
 *
 * `marketPrice`, `marketValue`, `unrealizedPnl`, `fxAdjustedMarketValue`
 * are all `Money`-branded strings. `fxRate` is the rate used to
 * normalize to the portfolio's base currency (nullable when the
 * holding's currency equals the base currency).
 */
import type { AssetSymbol } from "./symbol";
import type { Money, Currency } from "./brands";

export interface Position {
  readonly symbol: AssetSymbol;
  readonly quantity: Money;
  readonly avgCost: Money;
  readonly localCurrency: Currency;
  readonly marketPrice: Money | null;
  readonly marketValue: Money | null;
  readonly unrealizedPnl: Money | null;
  readonly fxRate: Money | null;
  readonly fxAdjustedMarketValue: Money | null;
}