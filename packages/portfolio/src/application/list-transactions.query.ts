/**
 * @openbulls/portfolio — `listTransactions` query.
 *
 * Returns the transaction history for a portfolio, newest first.
 * Optionally bounded by `[from, to]` time window. The portfolio
 * existence check is performed up-front so callers get a clean
 * `PortfolioNotFoundError` instead of an empty array when the
 * portfolio is missing.
 */
import { type Result, ok } from "@openbulls/shared";
import { Currency, Money, TransactionSide } from "../domain/brands";
import type { PortfolioError, PortfolioNotFoundError } from "../domain/errors";
import { PortfolioNotFoundError as PNF } from "../domain/errors";
import { AssetSymbol } from "../domain/symbol";
import type { Transaction } from "../domain/transaction";
import type { PortfolioDeps } from "./portfolio-deps";

export interface ListTransactionsInput {
  readonly portfolioId: string;
  readonly from?: Date;
  readonly to?: Date;
  readonly side?: TransactionSide;
  readonly limit?: number;
}

export async function listTransactions(
  deps: PortfolioDeps,
  input: ListTransactionsInput,
): Promise<Result<readonly Transaction[], PortfolioError | PortfolioNotFoundError>> {
  const portfolio = await deps.portfolios.getById(input.portfolioId);
  if (!portfolio) {
    return {
      ok: false,
      error: new PNF({ portfolioId: input.portfolioId as never }),
    } as Result<readonly Transaction[], PortfolioError>;
  }
  const rows = await deps.portfolios.listTransactions(input);
  const mapped: Transaction[] = rows.map((r) => ({
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
  return ok<readonly Transaction[]>(mapped);
}