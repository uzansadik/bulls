/**
 * @openbulls/portfolio — `recomputeHolding` command.
 *
 * Manual recompute hook for a single (portfolio, asset) holding.
 * Reads all transactions, replays them in `executedAt` order via
 * the pure `recomputeHolding` service, and upserts the resulting
 * aggregate. Used to repair holdings after corrections, bulk
 * imports, or schema migrations.
 *
 * Lazy recompute (the default strategy): each `addTransaction`
 * incrementally updates the holding. This command is the
 * reconciliation escape hatch for drift.
 *
 * Errors:
 *   - `PortfolioNotFoundError` — unknown portfolioId
 *   - `InvalidTransactionError` — replay fails (e.g. inconsistent history)
 */
import { type Result, err, ok } from "@openbulls/shared";
import { Currency, Money, PortfolioId, TransactionSide } from "../domain/brands";
import {
  InvalidTransactionError,
  type PortfolioError,
  PortfolioNotFoundError as PNF,
} from "../domain/errors";
import { recomputeHolding } from "../domain/services/cost-basis";
import { AssetSymbol } from "../domain/symbol";
import type { Transaction } from "../domain/transaction";
import type { PortfolioDeps } from "./portfolio-deps";

export interface RecomputeHoldingInput {
  readonly portfolioId: string;
  readonly assetSymbol: string;
}

export interface RecomputeHoldingOutput {
  readonly assetSymbol: ReturnType<typeof AssetSymbol>;
  readonly quantity: string;
  readonly avgCost: string;
  readonly realizedPnl: string;
  readonly lastComputedAt: Date;
}

export async function recomputeHoldingCmd(
  deps: PortfolioDeps,
  input: RecomputeHoldingInput,
): Promise<Result<RecomputeHoldingOutput, PortfolioError>> {
  const symbol = input.assetSymbol.trim();
  if (!symbol) {
    return err(
      new InvalidTransactionError({
        side: TransactionSide("buy"),
        reason: "assetSymbol must not be empty",
      }),
    );
  }
  const portfolio = await deps.portfolios.getById(input.portfolioId);
  if (!portfolio) {
    return err(new PNF({ portfolioId: PortfolioId(input.portfolioId) }));
  }

  const txList = await deps.portfolios.listTransactions({
    portfolioId: input.portfolioId,
  });
  const txForSymbol = txList.filter((r) => r.assetSymbol === symbol);
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

  const recomputed = recomputeHolding(txVO, AssetSymbol(symbol));
  if (!recomputed.ok) {
    return err(recomputed.error);
  }
  const { quantity, avgCost, realizedPnl } = recomputed.value;
  const lastComputedAt = deps.now();

  // If quantity is 0 after recompute, we still keep the row with
  // zeros so the holding history is preserved; callers that need
  // a clean slate can archive the portfolio separately.
  await deps.portfolios.upsertHolding({
    portfolioId: input.portfolioId,
    assetSymbol: symbol,
    quantity,
    avgCost,
    realizedPnl,
  });

  deps.logger.info("portfolio.holding.recomputed", {
    portfolioId: input.portfolioId,
    symbol,
    quantity,
    realizedPnl,
  });

  return ok({
    assetSymbol: AssetSymbol(symbol),
    quantity,
    avgCost,
    realizedPnl,
    lastComputedAt,
  });
}