/**
 * @openbulls/market-data — `Price` value object.
 *
 * Latest price snapshot for an asset. Lighter than `Quote` — only the
 * fields every provider reliably exposes. Use `Quote` when you also
 * need day high/low, change, or volume.
 */
import type { AssetSymbol, Currency, ProviderName } from "./brands";

export interface Price {
  readonly symbol: AssetSymbol;
  readonly price: number;
  readonly currency: Currency;
  readonly asOf: Date;
  readonly provider: ProviderName;
  /** True if the snapshot is from a delayed feed (free tier / sandbox). */
  readonly delayed: boolean;
}
