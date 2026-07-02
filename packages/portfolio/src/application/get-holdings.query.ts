/**
 * @openbulls/portfolio — `getHoldings` query.
 *
 * Returns the current materialized holdings for a portfolio
 * (one row per asset). Optionally enriched with the local
 * trade currency inferred from the holding's first transaction.
 * Quantities of `0` are filtered out by default — fully-closed
 * positions are returned only when `includeZero` is set.
 */
import { type Result, ok } from "@openbulls/shared";
import { Money, PortfolioId } from "../domain/brands";
import type { Currency } from "../domain/brands";
import {
  type PortfolioError,
  PortfolioNotFoundError as PNF,
} from "../domain/errors";
import { AssetSymbol } from "../domain/symbol";
import type { PortfolioDeps } from "./portfolio-deps";

export interface GetHoldingsInput {
  readonly portfolioId: string;
  readonly includeZero?: boolean;
}

export interface HoldingRow {
  readonly assetSymbol: ReturnType<typeof AssetSymbol>;
  readonly quantity: Money;
  readonly avgCost: Money;
  readonly realizedPnl: Money;
  readonly currency: Currency | null;
  readonly lastComputedAt: Date;
}

export async function getHoldings(
  deps: PortfolioDeps,
  input: GetHoldingsInput,
): Promise<Result<readonly HoldingRow[], PortfolioError>> {
  const portfolio = await deps.portfolios.getById(input.portfolioId);
  if (!portfolio) {
    return {
      ok: false,
      error: new PNF({ portfolioId: PortfolioId(input.portfolioId) }),
    } as Result<readonly HoldingRow[], PortfolioError>;
  }
  const rows = await deps.portfolios.getHoldings(input.portfolioId);

  // Derive each holding's trade currency from its earliest
  // transaction; null when no transactions exist yet.
  const txList = await deps.portfolios.listTransactions({
    portfolioId: input.portfolioId,
  });
  const earliestBySymbol = new Map<string, string>();
  for (const r of txList) {
    const prev = earliestBySymbol.get(r.assetSymbol);
    if (!prev || r.executedAt.getTime() < (earliestBySymbol.get(r.assetSymbol) ? 0 : Number.MAX_SAFE_INTEGER)) {
      // Sort later — for now just take the first observed per symbol.
      if (!prev) earliestBySymbol.set(r.assetSymbol, r.currency);
    }
  }
  // We still need a proper "earliest by executedAt" pass; the
  // first loop captures the first-inserted, which is good enough
  // for the common case but not strictly correct under unsorted
  // inserts. Re-do with explicit min:
  earliestBySymbol.clear();
  const earliestDate = new Map<string, { date: Date; currency: string }>();
  for (const r of txList) {
    const cur = earliestDate.get(r.assetSymbol);
    if (!cur || r.executedAt.getTime() < cur.date.getTime()) {
      earliestDate.set(r.assetSymbol, { date: r.executedAt, currency: r.currency });
    }
  }
  for (const [sym, v] of earliestDate) earliestBySymbol.set(sym, v.currency);

  const includeZero = input.includeZero === true;
  const mapped: HoldingRow[] = rows
    .map((r): HoldingRow | null => {
      const qty = Number(r.quantity);
      if (!includeZero && qty === 0) return null;
      return {
        assetSymbol: AssetSymbol(r.assetSymbol),
        quantity: Money(r.quantity),
        avgCost: Money(r.avgCost),
        realizedPnl: Money(r.realizedPnl),
        currency: (earliestBySymbol.get(r.assetSymbol) ?? null) as Currency | null,
        lastComputedAt: r.lastComputedAt,
      };
    })
    .filter((x): x is HoldingRow => x !== null);

  return ok<readonly HoldingRow[]>(mapped);
}