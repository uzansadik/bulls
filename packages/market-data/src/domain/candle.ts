/**
 * @openbulls/market-data — `Candle` value object.
 *
 * Single OHLCV bar for an asset at a given interval. Both open and
 * close timestamps are stored so providers that emit the bar boundary
 * differently (some use open, some use close) can be normalized at
 * the adapter boundary without losing data.
 *
 * `volume` is nullable because some asset classes (FX spot, indices)
 * don't report a meaningful volume.
 *
 * `provider` records which upstream supplied this row, useful for
 * debugging chain routing and for downstream cross-provider
 * reconciliation.
 */
import type { AssetSymbol, Interval, ProviderName } from "./brands";

export interface Candle {
  readonly symbol: AssetSymbol;
  readonly interval: Interval;
  readonly openTime: Date;
  readonly closeTime: Date;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number | null;
  readonly provider: ProviderName;
}
