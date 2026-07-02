/**
 * @openbulls/market-data — `Quote` value object.
 *
 * Extended snapshot of an asset: latest price plus trading-session
 * metadata (day high/low, change, volume, market state). Providers
 * that don't expose a field leave it `null` — UI layers should treat
 * `null` as "unknown", not "zero".
 */
import type { AssetSymbol, Currency, ProviderName } from "./brands";

/** Trading session state at the snapshot time. */
export type MarketState = "pre" | "regular" | "post" | "closed";

export interface Quote {
  readonly symbol: AssetSymbol;
  readonly price: number;
  readonly currency: Currency;
  readonly asOf: Date;
  readonly provider: ProviderName;
  readonly delayed: boolean;
  readonly dayHigh: number | null;
  readonly dayLow: number | null;
  /** Absolute change from previous close (not percent). */
  readonly dayChange: number | null;
  /** Percent change from previous close (0.0125 = +1.25%). */
  readonly dayChangePercent: number | null;
  readonly volume: number | null;
  readonly marketState: MarketState | null;
}
