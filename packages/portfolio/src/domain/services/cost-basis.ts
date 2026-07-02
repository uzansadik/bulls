/**
 * @openbulls/portfolio — average-cost recompute (pure).
 *
 * Recompute logic for the `Holding` aggregate. Given an ordered
 * list of transactions for a single asset, derive the current
 * `(quantity, avgCost, realizedPnl)` triple. The function is
 * `pure`: no I/O, no `now()` injection, deterministic for the
 * same input. Callers (`add-transaction.command.ts`,
 * `recompute-holding.command.ts`) sort the transactions by
 * `executedAt` before calling.
 *
 * Method: average cost.
 *
 *   `buy`, `transfer_in`:
 *     totalCost = qty * avgCost + txQty * txPrice + fees
 *     newQty    = qty + txQty
 *     avgCost   = totalCost / newQty
 *     realized  unchanged
 *
 *   `sell`, `transfer_out`:
 *     if txQty > qty → InvalidTransactionError (qty would go negative)
 *     costOfSold = avgCost * txQty
 *     proceeds   = txQty * txPrice - fees
 *     realized  += proceeds - costOfSold
 *     qty       -= txQty
 *     avgCost    unchanged (average-cost basis)
 *
 *   `dividend` (tx.quantity = 0, tx.unitPrice carries per-share div):
 *     realized += txQty * txPrice - fees     // cash inflow
 *
 *   `split` (tx.quantity = ratio, e.g. 2.0 for 2-for-1):
 *     qty     *= ratio
 *     avgCost /= ratio                       // price-scale adjustment
 *
 * Returns `Result` because invalid sells (oversell) are recoverable
 * domain errors; the caller maps to the command's Result return.
 */
import { type Result, err, ok } from "@openbulls/shared";
import { Money, type TransactionSide } from "../brands";
import { InvalidTransactionError } from "../errors";
import type { Transaction } from "../transaction";
import type { AssetSymbol } from "../symbol";

export interface RecomputedHolding {
  readonly quantity: Money;
  readonly avgCost: Money;
  readonly realizedPnl: Money;
}

export function recomputeHolding(
  transactions: readonly Transaction[],
  _symbol: AssetSymbol,
): Result<RecomputedHolding, InvalidTransactionError> {
  // Sort by executedAt ascending; ties broken by transaction id for
  // determinism (important for recompute equivalence).
  const sorted = [...transactions].sort((a, b) => {
    const dt = a.executedAt.getTime() - b.executedAt.getTime();
    if (dt !== 0) return dt;
    return a.id.localeCompare(b.id);
  });

  let qty = 0;
  let avgCost = 0;
  let realized = 0;

  for (const tx of sorted) {
    const txQty = Number(tx.quantity);
    const txPrice = Number(tx.unitPrice);
    const txFees = Number(tx.fees);
    const result = applyTransaction(tx.side, {
      qty,
      avgCost,
      realized,
      txQty,
      txPrice,
      txFees,
    });
    if (!result.ok) return result;
    qty = result.value.qty;
    avgCost = result.value.avgCost;
    realized = result.value.realized;
  }

  return ok({
    quantity: Money(qty.toFixed(8)),
    avgCost: Money(avgCost.toFixed(8)),
    realizedPnl: Money(realized.toFixed(8)),
  });
}

interface ApplyInput {
  readonly qty: number;
  readonly avgCost: number;
  readonly realized: number;
  readonly txQty: number;
  readonly txPrice: number;
  readonly txFees: number;
}

interface ApplyOutput {
  readonly qty: number;
  readonly avgCost: number;
  readonly realized: number;
}

function applyTransaction(
  side: TransactionSide,
  s: ApplyInput,
): Result<ApplyOutput, InvalidTransactionError> {
  switch (side) {
    case "buy":
    case "transfer_in": {
      const totalCost = s.qty * s.avgCost + s.txQty * s.txPrice + s.txFees;
      const newQty = s.qty + s.txQty;
      const avgCost = newQty > 0 ? totalCost / newQty : 0;
      return ok({ qty: newQty, avgCost, realized: s.realized });
    }
    case "sell":
    case "transfer_out": {
      if (s.txQty > s.qty) {
        return err(
          new InvalidTransactionError({
            side,
            reason: `cannot sell ${s.txQty} of ${s.qty} held`,
          }),
        );
      }
      const costOfSold = s.avgCost * s.txQty;
      const proceeds = s.txQty * s.txPrice - s.txFees;
      return ok({
        qty: s.qty - s.txQty,
        avgCost: s.avgCost,
        realized: s.realized + (proceeds - costOfSold),
      });
    }
    case "dividend": {
      // tx.quantity is 0; tx.unitPrice carries the per-share dividend.
      // txFees are deducted from the cash inflow.
      return ok({
        qty: s.qty,
        avgCost: s.avgCost,
        realized: s.realized + (s.txQty * s.txPrice - s.txFees),
      });
    }
    case "split": {
      // tx.quantity is the split ratio (e.g. 2.0 for 2-for-1).
      const ratio = s.txQty;
      if (ratio <= 0) {
        return err(
          new InvalidTransactionError({
            side,
            reason: `split ratio must be > 0, got ${ratio}`,
          }),
        );
      }
      return ok({
        qty: s.qty * ratio,
        avgCost: ratio > 0 ? s.avgCost / ratio : 0,
        realized: s.realized,
      });
    }
    default: {
      return err(
        new InvalidTransactionError({
          side,
          reason: `unknown side: ${String(side)}`,
        }),
      );
    }
  }
}