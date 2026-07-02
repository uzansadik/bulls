/**
 * @openbulls/portfolio — realized & unrealized PnL calculators (pure).
 *
 * `calculateUnrealizedPnl` is the mark-to-market gap between a
 * holding's average cost and the latest market price:
 *
 *   unrealized = quantity * (marketPrice - avgCost)
 *
 * `calculateRealizedPnl` re-derives realized from the same
 * transaction log via the average-cost recompute helper, so the
 * two views can never disagree on `Holding.realizedPnl` (the
 * authoritative column). Callers usually just read the column
 * directly; this helper exists for verification & audit use
 * cases (e.g. cron job that asserts `holding.realizedPnl ===
 * calculateRealizedPnl(transactions)`).
 *
 * All inputs/outputs use `numeric(20,8)` strings (Money brand) for
 * precision parity with the DB.
 */
import { Money, type Money as MoneyT } from "../brands";
import { recomputeHolding } from "./cost-basis";
import type { Transaction } from "../transaction";
import type { AssetSymbol } from "../symbol";

export function calculateUnrealizedPnl(
  quantity: MoneyT,
  avgCost: MoneyT,
  marketPrice: MoneyT,
): MoneyT {
  const delta = Number(marketPrice) - Number(avgCost);
  return Money((Number(quantity) * delta).toFixed(8));
}

export function calculateRealizedPnl(
  transactions: readonly Transaction[],
  symbol: AssetSymbol,
): MoneyT {
  const r = recomputeHolding(transactions, symbol);
  if (!r.ok) return Money("0");
  return r.value.realizedPnl;
}