/**
 * @openbulls/portfolio — `deleteTransaction` use case.
 *
 * Removes a transaction by id and replays the affected holding
 * recompute. Used for corrections and test fixtures — not for
 * normal flow (transactions are immutable in the average-cost
 * method; reversing a buy requires a sell, not a delete).
 *
 * Errors:
 *   - `TransactionNotFoundError` — unknown transactionId
 *   - `ArchivedPortfolioError`   — portfolio is read-only
 */
import { type Result, err, ok } from "@openbulls/shared";
import { Currency, Money, PortfolioId, TransactionSide } from "../domain/brands";
import {
  ArchivedPortfolioError,
  type PortfolioError,
  TransactionNotFoundError as TNF,
} from "../domain/errors";
import { recomputeHolding } from "../domain/services/cost-basis";
import { AssetSymbol } from "../domain/symbol";
import type { Transaction } from "../domain/transaction";
import type { PortfolioDeps } from "./portfolio-deps";

export interface DeleteTransactionInput {
  readonly transactionId: string;
}

export interface DeleteTransactionOutput {
  readonly transactionId: string;
  readonly portfolioId: string;
  readonly deletedAt: Date;
  readonly recomputedHolding: {
    readonly assetSymbol: ReturnType<typeof AssetSymbol>;
    readonly quantity: string;
    readonly avgCost: string;
    readonly realizedPnl: string;
  };
}

export async function deleteTransaction(
  deps: PortfolioDeps,
  input: DeleteTransactionInput,
): Promise<Result<DeleteTransactionOutput, PortfolioError>> {
  // Fetch via listTransactions filtered by id is inefficient; the
  // repository exposes only `listTransactions` here, so we list
  // and filter. For high-volume portfolios a `getTransactionById`
  // port method should be added in a later phase.
  const txList = await deps.portfolios.listTransactions({
    portfolioId: "", // unused — we filter in memory
    limit: 1_000_000,
  });
  const target = txList.find((r) => r.id === input.transactionId);
  if (!target) {
    return err(new TNF({ transactionId: input.transactionId }));
  }

  const portfolio = await deps.portfolios.getById(target.portfolioId);
  if (!portfolio) {
    // transaction references a missing portfolio — the FK should
    // prevent this, but guard anyway.
    return err(
      new ArchivedPortfolioError({ portfolioId: PortfolioId(target.portfolioId) }),
    );
  }
  if (portfolio.isArchived) {
    return err(new ArchivedPortfolioError({ portfolioId: PortfolioId(portfolio.id) }));
  }

  await deps.portfolios.deleteTransaction(input.transactionId);

  // Replay recompute for the affected symbol so the holding
  // reflects the new transaction set.
  const txAfter = await deps.portfolios.listTransactions({
    portfolioId: target.portfolioId,
  });
  const txForSymbol = txAfter.filter(
    (r) => r.assetSymbol === target.assetSymbol,
  );
  const txVO: readonly Transaction[] = txForSymbol.map((r) => ({
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
  const recomputed = recomputeHolding(txVO, AssetSymbol(target.assetSymbol));
  if (!recomputed.ok) {
    return err(recomputed.error);
  }
  const { quantity, avgCost, realizedPnl } = recomputed.value;
  await deps.portfolios.upsertHolding({
    portfolioId: target.portfolioId,
    assetSymbol: target.assetSymbol,
    quantity,
    avgCost,
    realizedPnl,
  });

  deps.logger.info("portfolio.transaction.deleted", {
    transactionId: input.transactionId,
    portfolioId: target.portfolioId,
  });

  return ok({
    transactionId: input.transactionId,
    portfolioId: target.portfolioId,
    deletedAt: deps.now(),
    recomputedHolding: {
      assetSymbol: AssetSymbol(target.assetSymbol),
      quantity,
      avgCost,
      realizedPnl,
    },
  });
}