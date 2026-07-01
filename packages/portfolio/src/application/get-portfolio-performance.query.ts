/**
 * @openbulls/portfolio — `getPortfolioPerformance` query.
 *
 * Computes three metrics for the requested window:
 *
 *   - `totalReturn`         — money-weighted
 *   - `timeWeightedReturn`  — Modified Dietz (cashflow-aware)
 *   - `maxDrawdown`         — peak-to-trough on optional equity curve
 *
 * Cashflows are signed:
 *   - `buy`, `transfer_in` → +qty*price - fees   (money out)
 *   - `sell`, `transfer_out` → -(qty*price - fees)  (money in)
 *   - `dividend` → +(qty*price - fees)
 *   - `split` → 0 (non-cash; affects share count)
 *
 * The query aggregates a synthetic equity curve only when the
 * caller supplies one (typically from a historical-prices
 * service — out of scope for Phase 2). Without a curve,
 * `maxDrawdown` returns 0.
 *
 * Errors:
 *   - `PortfolioNotFoundError` — unknown portfolioId
 *   - `InvalidInputError`      — `from >= to`, bad baseCurrency
 */
import { type Result, err, ok } from "@openbulls/shared";
import { Currency, Money, PortfolioId } from "../domain/brands";
import type { Cashflow, EquityPoint } from "../domain/pnl";
import type { PerformanceSnapshot } from "../domain/pnl";
import {
  InvalidInputError,
  type PortfolioError,
  PortfolioNotFoundError as PNF,
} from "../domain/errors";
import {
  calculateMaxDrawdown,
  calculateTimeWeightedReturn,
  calculateTotalReturn,
} from "../domain/services/performance";
import { FxRateMap, convert } from "../domain/services/fx-adjust";
import type { PortfolioDeps } from "./portfolio-deps";

export interface GetPortfolioPerformanceInput {
  readonly portfolioId: string;
  readonly from: Date;
  readonly to: Date;
  readonly baseCurrency?: string;
  /**
   * Optional historical equity curve in `baseCurrency`. When
   * omitted, `maxDrawdown` is 0 and `maxDrawdownWindow` is null.
   */
  readonly equityCurve?: readonly EquityPoint[];
}

export async function getPortfolioPerformance(
  deps: PortfolioDeps,
  input: GetPortfolioPerformanceInput,
): Promise<Result<PerformanceSnapshot, PortfolioError>> {
  if (!(input.from.getTime() < input.to.getTime())) {
    return err(
      new InvalidInputError({ field: "from/to", reason: "from must be strictly before to" }),
    );
  }

  const portfolio = await deps.portfolios.getById(input.portfolioId);
  if (!portfolio) {
    return err(new PNF({ portfolioId: PortfolioId(input.portfolioId) }));
  }
  const baseCurrency = Currency(input.baseCurrency ?? portfolio.baseCurrency);

  // Fetch all transactions in one shot; partition by window.
  const allTx = await deps.portfolios.listTransactions({
    portfolioId: input.portfolioId,
    from: new Date(0),
    to: new Date(Number.MAX_SAFE_INTEGER),
  });
  const txInWindow = allTx.filter(
    (r) =>
      r.executedAt.getTime() >= input.from.getTime() &&
      r.executedAt.getTime() <= input.to.getTime(),
  );
  const txBeforeFrom = allTx.filter((r) => r.executedAt.getTime() < input.from.getTime());

  // Cumulative invested capital at `from`: sum of buy/transfer_in
  // cost basis before the window.
  let investedAtFrom = 0;
  for (const r of txBeforeFrom) {
    if (r.side === "buy" || r.side === "transfer_in") {
      investedAtFrom += Number(r.quantity) * Number(r.unitPrice) + Number(r.fees);
    } else if (r.side === "sell" || r.side === "transfer_out") {
      investedAtFrom -= Number(r.quantity) * Number(r.unitPrice) - Number(r.fees);
    } else if (r.side === "dividend") {
      investedAtFrom -= Number(r.quantity) * Number(r.unitPrice) - Number(r.fees);
    }
  }

  // Cashflows in window (in local currency, then FX-adjusted).
  const fxMap = new FxRateMap();
  const distinctCurrencies = new Set<string>();
  for (const r of txInWindow) distinctCurrencies.add(r.currency);
  for (const ccy of distinctCurrencies) {
    if (ccy === baseCurrency) continue;
    const fxResult = await deps.marketData.getFxRate({
      base: Currency(ccy),
      quote: baseCurrency,
    });
    if (fxResult.ok) fxMap.setRate(fxResult.value);
  }

  const cashflows: Cashflow[] = [];
  for (const r of txInWindow) {
    if (r.side === "split") continue;
    const local = Number(r.quantity) * Number(r.unitPrice) + Number(r.fees);
    let signed = 0;
    if (r.side === "buy" || r.side === "transfer_in") signed = -local; // outflow
    else if (r.side === "sell" || r.side === "transfer_out") signed = local; // inflow
    else if (r.side === "dividend") signed = local; // inflow
    const base =
      r.currency === baseCurrency
        ? Money(signed.toFixed(8))
        : (convert(Money(signed.toFixed(8)), Currency(r.currency), baseCurrency, fxMap) ?? Money("0"));
    cashflows.push({ at: r.executedAt, amount: base, currency: baseCurrency });
  }

  // BMV = portfolio market value at `from`. Without historical
  // quotes we approximate using invested capital (a constant
  // basis); the relative TWR is still meaningful because cashflow
  // weighting accounts for in-window flows. When a market data
  // snapshot at `from` is available later, swap this for that
  // value.
  const bmv = Money(investedAtFrom.toFixed(8));

  // EMV = current portfolio market value via holdings.
  const holdings = await deps.portfolios.getHoldings(input.portfolioId);
  const earliestDate = new Map<string, { date: Date; currency: string }>();
  for (const r of allTx) {
    const cur = earliestDate.get(r.assetSymbol);
    if (!cur || r.executedAt.getTime() < cur.date.getTime()) {
      earliestDate.set(r.assetSymbol, { date: r.executedAt, currency: r.currency });
    }
  }
  let emv = 0;
  for (const h of holdings) {
    const qty = Number(h.quantity);
    if (qty === 0) continue;
    const localCcy = earliestDate.get(h.assetSymbol)?.currency ?? baseCurrency;
    const quoteResult = await deps.marketData.getQuote({
      symbol: h.assetSymbol as never,
    });
    const localValue = quoteResult.ok ? Number(quoteResult.value.price) * qty : Number(h.avgCost) * qty;
    const baseValue =
      localCcy === baseCurrency
        ? localValue
        : Number(
            convert(Money(localValue.toFixed(8)), Currency(localCcy), baseCurrency, fxMap) ??
              Money(localValue.toFixed(8)),
          );
    emv += baseValue;
  }
  const emvMoney = Money(emv.toFixed(8));

  // Realized + unrealized for the window.
  let realizedInWindow = 0;
  for (const r of txInWindow) {
    if (r.side === "sell" || r.side === "transfer_out") {
      realizedInWindow += Number(r.quantity) * Number(r.unitPrice) - Number(r.fees);
    } else if (r.side === "dividend") {
      realizedInWindow += Number(r.quantity) * Number(r.unitPrice) - Number(r.fees);
    }
  }
  let unrealizedAtTo = emv - investedAtFrom;
  for (const r of txInWindow) {
    if (r.side === "buy" || r.side === "transfer_in") {
      unrealizedAtTo -= Number(r.quantity) * Number(r.unitPrice) + Number(r.fees);
    } else if (r.side === "sell" || r.side === "transfer_out") {
      unrealizedAtTo += Number(r.quantity) * Number(r.unitPrice) - Number(r.fees);
    } else if (r.side === "dividend") {
      unrealizedAtTo -= Number(r.quantity) * Number(r.unitPrice) - Number(r.fees);
    }
  }

  const totalReturn = calculateTotalReturn(bmv, emvMoney, Money(investedAtFrom.toFixed(8)));
  const twr = calculateTimeWeightedReturn(bmv, emvMoney, cashflows, input.from, input.to);
  const mdd = input.equityCurve
    ? calculateMaxDrawdown(input.equityCurve)
    : { drawdown: 0, peak: null, trough: null };

  return ok<PerformanceSnapshot>({
    totalReturn,
    timeWeightedReturn: twr,
    maxDrawdown: mdd.drawdown,
    realizedPnl: Money(realizedInWindow.toFixed(8)),
    unrealizedPnl: Money(unrealizedAtTo.toFixed(8)),
    baseCurrency,
    from: input.from,
    to: input.to,
    maxDrawdownWindow:
      mdd.peak && mdd.trough ? { peak: mdd.peak, trough: mdd.trough } : null,
  });
}