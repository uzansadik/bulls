/**
 * @openbulls/portfolio — minimal FX rate shape.
 *
 * Decoupled from `@openbulls/market-data` so the portfolio domain
 * stays free of upstream dependencies. The composition root wraps
 * `MarketDataServices.getFxRate` to produce this shape; the pure
 * `convert` helper in `domain/services/fx-adjust.ts` consumes it.
 */
import type { Currency } from "./brands";

export interface FxRate {
  readonly base: Currency;
  readonly quote: Currency;
  readonly rate: number;
  readonly asOf: Date;
  readonly provider: string;
}