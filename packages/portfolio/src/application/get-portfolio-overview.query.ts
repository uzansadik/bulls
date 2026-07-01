/**
 * @openbulls/portfolio — `getPortfolioOverview` query.
 *
 * Builds a `PortfolioSnapshot`: portfolio metadata + one
 * `Position` per holding (FX-adjusted to the portfolio's base
 * currency) + aggregated totals. Market quotes and FX rates
 * are fetched on demand through `IMarketDataQueryGateway`.
 *
 * Behavior:
 *   - Holdings with `quantity == 0` are skipped (no exposure).
 *   - `marketPrice` / `marketValue` / `unrealizedPnl` are
 *     `null` when market data is unavailable for the symbol.
 *   - `fxRate` is `null` when the holding currency equals the
 *     portfolio base currency (identity, no conversion).
 *   - `totals.totalMarketValue` / `totals.totalUnrealizedPnl` are
 *     `null` when *any* position lacks market data (cannot
 *     sum across a hole).
 */
import { type Result, err, ok } from "@openbulls/shared";
import {
  Currency,
  Money,
  PortfolioId,
  UserId,
} from "../domain/brands";
import {
  type PortfolioError,
  PortfolioNotFoundError as PNF,
} from "../domain/errors";
import { FxRateMap, convert } from "../domain/services/fx-adjust";
import { AssetSymbol } from "../domain/symbol";
import type { Portfolio } from "../domain/portfolio";
import type { Position } from "../domain/position";
import type { PortfolioSnapshot, PortfolioTotals } from "../domain/snapshot";
import type { PortfolioDeps } from "./portfolio-deps";

export interface GetPortfolioOverviewInput {
  readonly portfolioId: string;
}

export async function getPortfolioOverview(
  deps: PortfolioDeps,
  input: GetPortfolioOverviewInput,
): Promise<Result<PortfolioSnapshot, PortfolioError>> {
  const portfolio = await deps.portfolios.getById(input.portfolioId);
  if (!portfolio) {
    return err(new PNF({ portfolioId: PortfolioId(input.portfolioId) }));
  }

  const portfolioVO: Portfolio = {
    id: PortfolioId(portfolio.id),
    userId: UserId(portfolio.userId),
    name: portfolio.name,
    baseCurrency: Currency(portfolio.baseCurrency),
    isArchived: portfolio.isArchived,
    createdAt: portfolio.createdAt,
    updatedAt: portfolio.updatedAt,
  };
  const baseCurrency = portfolioVO.baseCurrency;

  // Holdings + transactions to infer per-symbol currency.
  const holdingRows = await deps.portfolios.getHoldings(input.portfolioId);
  const txList = await deps.portfolios.listTransactions({
    portfolioId: input.portfolioId,
  });
  const earliestBySymbol = new Map<string, { date: Date; currency: string }>();
  for (const r of txList) {
    const cur = earliestBySymbol.get(r.assetSymbol);
    if (!cur || r.executedAt.getTime() < cur.date.getTime()) {
      earliestBySymbol.set(r.assetSymbol, { date: r.executedAt, currency: r.currency });
    }
  }

  // Build FX rate cache for this snapshot.
  const fxMap = new FxRateMap();
  const distinctCurrencies = new Set<string>();
  for (const r of holdingRows) {
    const ccy = earliestBySymbol.get(r.assetSymbol)?.currency;
    if (ccy && ccy !== baseCurrency) distinctCurrencies.add(ccy);
  }
  for (const ccy of distinctCurrencies) {
    const fxResult = await deps.marketData.getFxRate({
      base: Currency(ccy),
      quote: baseCurrency,
    });
    if (fxResult.ok) {
      fxMap.setRate(fxResult.value);
    }
    // Failures are tolerated — that position will simply have a
    // null fxAdjustedMarketValue and totals.totalMarketValue
    // will be null.
  }

  const positions: Position[] = [];
  let totalCost = 0;
  let totalMarketValue: number | null = 0;
  let totalUnrealizedPnl: number | null = 0;
  let totalRealizedPnl = 0;
  let totalsDirty = false;

  for (const h of holdingRows) {
    const qty = Number(h.quantity);
    if (qty === 0) continue;

    const localCurrency = Currency(earliestBySymbol.get(h.assetSymbol)?.currency ?? baseCurrency);

    // Quote
    const quoteResult = await deps.marketData.getQuote({
      symbol: AssetSymbol(h.assetSymbol),
    });
    let marketPrice: Money | null = null;
    let marketValue: Money | null = null;
    let unrealizedPnl: Money | null = null;
    if (quoteResult.ok) {
      marketPrice = quoteResult.value.price;
      const mv = Number(marketPrice) * qty;
      marketValue = Money(mv.toFixed(8));
      const up = mv - Number(h.avgCost) * qty;
      unrealizedPnl = Money(up.toFixed(8));
    } else {
      totalsDirty = true;
    }

    // FX
    let fxRate: Money | null = null;
    let fxAdjustedMarketValue: Money | null = null;
    if (localCurrency !== baseCurrency) {
      const fxAdjusted = convert(Money(marketValue ?? "0"), localCurrency, baseCurrency, fxMap);
      if (fxAdjusted !== null) {
        fxAdjustedMarketValue = fxAdjusted;
        fxRate = Money(
          (fxMap.getRate(localCurrency, baseCurrency)?.rate ?? 0).toFixed(8),
        );
      } else {
        totalsDirty = true;
      }
    } else {
      fxAdjustedMarketValue = marketValue;
    }

    const cost = Number(h.avgCost) * qty;
    totalCost += cost;
    if (marketValue !== null && fxAdjustedMarketValue !== null) {
      totalMarketValue = (totalMarketValue ?? 0) + Number(fxAdjustedMarketValue);
      totalUnrealizedPnl = (totalUnrealizedPnl ?? 0) + (Number(fxAdjustedMarketValue) - cost);
    } else {
      totalsDirty = true;
    }
    totalRealizedPnl += Number(h.realizedPnl);

    positions.push({
      symbol: AssetSymbol(h.assetSymbol),
      quantity: Money(h.quantity),
      avgCost: Money(h.avgCost),
      localCurrency,
      marketPrice,
      marketValue,
      unrealizedPnl,
      fxRate,
      fxAdjustedMarketValue,
    });
  }

  const totals: PortfolioTotals = {
    totalCost: Money(totalCost.toFixed(8)),
    totalMarketValue: totalsDirty ? null : Money((totalMarketValue ?? 0).toFixed(8)),
    totalUnrealizedPnl: totalsDirty ? null : Money((totalUnrealizedPnl ?? 0).toFixed(8)),
    totalRealizedPnl: Money(totalRealizedPnl.toFixed(8)),
    baseCurrency,
    asOf: deps.now(),
  };

  return ok<PortfolioSnapshot>({
    portfolio: portfolioVO,
    positions,
    totals,
  });
}