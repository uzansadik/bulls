/**
 * @openbulls/portfolio — Transaction VO.
 *
 * Every change to a holding starts here. Stored in
 * `portfolio_transactions`. The `side` discriminator drives the
 * recompute logic in `domain/services/cost-basis.ts`.
 *
 * `quantity` semantics per side:
 *
 *   - `buy`, `transfer_in`, `dividend` → positive quantity of units
 *     acquired. For `dividend`, quantity is 0 (cash inflow); the
 *     `unitPrice` carries the per-share dividend, `fees` are 0.
 *   - `sell`, `transfer_out` → positive quantity of units disposed.
 *   - `split` → quantity is the split ratio (2.0 = 2-for-1).
 *
 * `unitPrice`, `fees`, `quantity` are Money-branded strings
 * (`numeric(20,8)` Drizzle format). Currency is the trade currency,
 * not the portfolio base currency.
 */
import type { Money, Currency, TransactionSide } from "./brands";
import type { AssetSymbol } from "./symbol";

export interface Transaction {
  readonly id: string;
  readonly portfolioId: string;
  readonly assetSymbol: AssetSymbol;
  readonly side: TransactionSide;
  readonly quantity: Money;
  readonly unitPrice: Money;
  readonly fees: Money;
  readonly currency: Currency;
  readonly executedAt: Date;
  readonly notes: string | null;
}