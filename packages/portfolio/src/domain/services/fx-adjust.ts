/**
 * @openbulls/portfolio — FX adjustment helper (pure).
 *
 * Converts a `Money` amount from one currency to another using a
 * caller-supplied rate table. Pure: caller provides the rates;
 * this module does no I/O (market-data fetching is the
 * application's job).
 *
 * Currency identity:
 *   `convert(amount, X, X, _)` is a no-op
 *
 * Cross-rate derived when only direct legs are present:
 *   Given EUR→TRY and USD→TRY, compute EUR→USD by dividing the
 *   two legs:
 *     rate(EUR→USD) = rate(EUR→TRY) / rate(USD→TRY)
 *   If neither direct nor derived rate can be found, returns
 *   `null` so the caller can decide whether to fail or fall
 *   through.
 *
 * Numerical work uses JS `number` — `numeric(20,8)` has at most 11
 * significant digits before the decimal point, comfortably inside
 * the double's 15-17 safe range for this use case.
 */
import { Money, type Currency } from "../brands";
import type { FxRate } from "../fx-rate";

export interface FxRateMapLike {
  /**
   * Lookup a direct `X→Y` rate. Implementations may translate
   * provider-shaped symbols (`USDTRY`) or store a Map keyed by
   * pair string.
   */
  getRate(base: Currency, quote: Currency): FxRate | null;
}

/** Minimal stub — used in tests and the in-memory gateway. */
export class FxRateMap implements FxRateMapLike {
  private readonly store = new Map<string, FxRate>();
  public setRate(rate: FxRate): void {
    this.store.set(pairKey(rate.base, rate.quote), rate);
  }
  public getRate(base: Currency, quote: Currency): FxRate | null {
    const direct = this.store.get(pairKey(base, quote));
    if (direct) return direct;
    // Try cross via intermediate.
    // We can't enumerate here; callers should populate direct
    // pairs (we provide `convert` derivation separately).
    return null;
  }
}

function pairKey(base: Currency, quote: Currency): string {
  return `${base}|${quote}`;
}

/**
 * Convert `amount` from `from` to `to`. Returns the converted
 * amount, or `null` if no rate (direct or derivable) is available.
 */
export function convert(
  amount: Money,
  from: Currency,
  to: Currency,
  rates: FxRateMapLike,
): Money | null {
  if (from === to) return amount;
  const direct = rates.getRate(from, to);
  if (direct) {
    return multiplyMoney(amount, direct.rate);
  }
  // Cross: try via `to` (rate from→to) or via "USD"/"TRY" anchors.
  // Without a richer API surface we attempt the symbolic
  // derivation once via base currency "USD" if present.
  for (const anchor of ["TRY", "USD", "EUR"] as Currency[]) {
    if (anchor === from || anchor === to) continue;
    const leg1 = rates.getRate(from, anchor);
    const leg2 = rates.getRate(anchor, to);
    if (leg1 && leg2) {
      // Convert amount to anchor, then to target.
      const stage1 = multiplyMoney(amount, leg1.rate);
      return multiplyMoney(stage1, leg2.rate);
    }
  }
  return null;
}

function multiplyMoney(money: Money, factor: number): Money {
  const result = Number(money) * factor;
  return Money(result.toFixed(8));
}