/**
 * @openbulls/market-data — `FxRate` value object.
 *
 * Single FX rate observation. `base` and `quote` are the ISO 4217
 * currency codes ("USD", "TRY", "EUR", ...). The rate expresses
 * `1 base = rate quote`.
 */
import type { Currency, ProviderName } from "./brands";

export interface FxRate {
  readonly base: Currency;
  readonly quote: Currency;
  readonly rate: number;
  readonly asOf: Date;
  readonly provider: ProviderName;
}
