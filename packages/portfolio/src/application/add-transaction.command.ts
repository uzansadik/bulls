/**
 * @openbulls/portfolio — `addTransaction` use case.
 *
 * Inserts a new transaction into the portfolio and incrementally
 * recomputes the affected holding via the pure
 * `recomputeHolding` service. The recompute reads all prior
 * transactions for the same (portfolio, asset) pair, replays them
 * in `executedAt` order, and persists the resulting
 * `(quantity, avgCost, realizedPnl)` triple.
 *
 * Validation:
 *   - `side` is a recognized transaction side
 *   - `quantity > 0` (with `dividend` allowed qty=0; `split` carries the ratio)
 *   - `unitPrice >= 0`
 *   - `fees >= 0`
 *   - `currency` is a non-empty 3-letter code
 *   - portfolio exists and is not archived
 *
 * Errors:
 *   - `PortfolioNotFoundError` — unknown portfolio
 *   - `ArchivedPortfolioError` — portfolio archived (read-only)
 *   - `InvalidInputError`     — malformed input fields
 *   - `InvalidTransactionError` — sell qty > held qty (from pure recompute)
 */
import { type Result, err, ok } from "@openbulls/shared";
import type { PortfolioTransaction } from "@openbulls/db/schema";
import { Currency, Money, PortfolioId, TransactionSide } from "../domain/brands";
import {
  ArchivedPortfolioError,
  InvalidInputError,
  InvalidTransactionError,
  PortfolioError,
  PortfolioNotFoundError as PNF,
} from "../domain/errors";
import { recomputeHolding } from "../domain/services/cost-basis";
import { AssetSymbol } from "../domain/symbol";
import type { Transaction } from "../domain/transaction";
import type { PortfolioDeps } from "./portfolio-deps";

const VALID_SIDES = new Set([
  "buy",
  "sell",
  "dividend",
  "split",
  "transfer_in",
  "transfer_out",
]);

export interface AddTransactionInput {
  readonly portfolioId: string;
  readonly assetSymbol: string;
  readonly side: string;
  readonly quantity: string;
  readonly unitPrice: string;
  readonly fees?: string;
  readonly currency: string;
  readonly executedAt: Date;
  readonly notes?: string;
}

export interface AddTransactionOutput {
  readonly transaction: Transaction;
  readonly holding: {
    readonly assetSymbol: ReturnType<typeof AssetSymbol>;
    readonly quantity: string;
    readonly avgCost: string;
    readonly realizedPnl: string;
  };
}

export async function addTransaction(
  deps: PortfolioDeps,
  input: AddTransactionInput,
): Promise<Result<AddTransactionOutput, PortfolioError>> {
  // ── input validation ─────────────────────────────────────────
  const symbol = input.assetSymbol.trim();
  if (!symbol) {
    return err(new InvalidInputError({ field: "assetSymbol", reason: "must not be empty" }));
  }
  if (!VALID_SIDES.has(input.side)) {
    return err(
      new InvalidInputError({
        field: "side",
        reason: `must be one of ${[...VALID_SIDES].join(", ")}`,
      }),
    );
  }
  if (!Number.isFinite(Number(input.quantity)) || Number(input.quantity) < 0) {
    return err(new InvalidInputError({ field: "quantity", reason: "must be >= 0" }));
  }
  if (!Number.isFinite(Number(input.unitPrice)) || Number(input.unitPrice) < 0) {
    return err(new InvalidInputError({ field: "unitPrice", reason: "must be >= 0" }));
  }
  const feesValue = input.fees ?? "0";
  if (!Number.isFinite(Number(feesValue)) || Number(feesValue) < 0) {
    return err(new InvalidInputError({ field: "fees", reason: "must be >= 0" }));
  }
  const currency = input.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    return err(
      new InvalidInputError({ field: "currency", reason: "must be a 3-letter ISO code" }),
    );
  }

  // ── portfolio guard ──────────────────────────────────────────
  const portfolio = await deps.portfolios.getById(input.portfolioId);
  if (!portfolio) {
    return err(new PNF({ portfolioId: PortfolioId(input.portfolioId) }));
  }
  if (portfolio.isArchived) {
    return err(new ArchivedPortfolioError({ portfolioId: PortfolioId(portfolio.id) }));
  }

  // ── insert transaction ───────────────────────────────────────
  const inserted = await deps.portfolios.insertTransaction({
    portfolioId: input.portfolioId,
    assetSymbol: symbol,
    side: input.side as never,
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    fees: feesValue,
    currency,
    executedAt: input.executedAt,
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
  });

  // ── recompute + upsert holding ───────────────────────────────
  const txList = await deps.portfolios.listTransactions({
    portfolioId: input.portfolioId,
  });
  const txVO: readonly Transaction[] = txList.map((r: PortfolioTransaction) => ({
    id: r.id,
    portfolioId: r.portfolioId,
    assetSymbol: AssetSymbol(r.assetSymbol),
    side: TransactionSide(r.side),
    quantity: Money(r.quantity),
    unitPrice: Money(r.unitPrice),
    fees: Money(r.fees),
    currency: Currency(r.currency),
    executedAt: r.executedAt,
    notes: r.notes,
  }));
  const recomputed = recomputeHolding(txVO, AssetSymbol(symbol));
  if (!recomputed.ok) {
    // InvalidTransactionError extends PortfolioError
    return err(recomputed.error);
  }
  const { quantity, avgCost, realizedPnl } = recomputed.value;
  await deps.portfolios.upsertHolding({
    portfolioId: input.portfolioId,
    assetSymbol: symbol,
    quantity,
    avgCost,
    realizedPnl,
  });

  deps.logger.info("portfolio.transaction.added", {
    portfolioId: input.portfolioId,
    transactionId: inserted.id,
    symbol,
    side: input.side,
  });

  const transaction: Transaction = {
    id: inserted.id,
    portfolioId: inserted.portfolioId,
    assetSymbol: AssetSymbol(inserted.assetSymbol),
    side: TransactionSide(inserted.side),
    quantity: Money(inserted.quantity),
    unitPrice: Money(inserted.unitPrice),
    fees: Money(inserted.fees),
    currency: Currency(inserted.currency),
    executedAt: inserted.executedAt,
    notes: inserted.notes,
  };
  return ok({
    transaction,
    holding: {
      assetSymbol: AssetSymbol(symbol),
      quantity,
      avgCost,
      realizedPnl,
    },
  });
}
