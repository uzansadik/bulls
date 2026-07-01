/**
 * @openbulls/portfolio — Holding VO.
 *
 * Materialized aggregate of all transactions for a single
 * (portfolio, asset) pair. Stored in `portfolio_holdings` and
 * incrementally recomputed by `add-transaction.command.ts` and
 * `recompute-holding.command.ts` via the pure `recomputeHolding`
 * helper.
 *
 * `avgCost` is the running average cost per unit including fees
 * (for buys). For a fresh position, it equals the first buy's
 * unitPrice. After a sell, `avgCost` is unchanged (average-cost
 * method), only `quantity` decreases.
 *
 * `realizedPnl` accumulates `proceeds − costOfSold − fees` for
 * each sell, plus `unitPrice × quantity − fees` for each dividend
 * payment.
 *
 * `currency` is the holding's local trade currency; FX-adjusted
 * views live in `Position` (computed on read).
 */
import type { AssetSymbol } from "./symbol";
import type { Money, Currency } from "./brands";

export interface Holding {
  readonly portfolioId: string;
  readonly assetSymbol: AssetSymbol;
  readonly quantity: Money;
  readonly avgCost: Money;
  readonly realizedPnl: Money;
  readonly currency: Currency;
  readonly lastComputedAt: Date;
}