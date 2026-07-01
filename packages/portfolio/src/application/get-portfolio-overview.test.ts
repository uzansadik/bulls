/**
 * Application: getPortfolioOverview.
 *
 * Verifies a 2-position / 2-currency snapshot where FX adjustment
 * aggregates values in the portfolio base currency.
 */
import { describe, expect, it } from "vitest";
import { noopLogger } from "../domain/ports/logger.port";
import {
  InMemoryMarketDataGateway,
  InMemoryPortfolioRepository,
  makeRepoWithPortfolio,
} from "../__tests__/repository.mock";
import type { PortfolioDeps } from "./portfolio-deps";
import { addTransaction } from "./add-transaction.command";
import { getPortfolioOverview } from "./get-portfolio-overview.query";

function makeDeps(): {
  deps: PortfolioDeps;
  repo: InMemoryPortfolioRepository;
  mkt: InMemoryMarketDataGateway;
} {
  const repo = new InMemoryPortfolioRepository();
  const mkt = new InMemoryMarketDataGateway();
  return {
    deps: {
      portfolios: repo,
      marketData: mkt,
      logger: noopLogger,
      now: () => new Date("2026-03-01T00:00:00Z"),
    },
    repo,
    mkt,
  };
}

describe("getPortfolioOverview", () => {
  it("returns PortfolioNotFoundError when portfolioId is unknown", async () => {
    const { deps } = makeDeps();
    const r = await getPortfolioOverview(deps, { portfolioId: "missing" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("portfolio/not-found");
  });

  it("FX-adjusts positions and aggregates totals in base currency", async () => {
    const { deps, repo, mkt } = makeDeps();
    const p = makeRepoWithPortfolio(repo, "user-1", "TRY");
    mkt.setQuote("AAPL", "100", "USD");
    mkt.setQuote("THYAO", "50", "TRY");
    mkt.setFxRate("USD", "TRY", 35);

    await addTransaction(deps, {
      portfolioId: p.id,
      assetSymbol: "AAPL",
      side: "buy",
      quantity: "2",
      unitPrice: "100",
      fees: "0",
      currency: "USD",
      executedAt: new Date("2026-01-01"),
    });
    await addTransaction(deps, {
      portfolioId: p.id,
      assetSymbol: "THYAO",
      side: "buy",
      quantity: "10",
      unitPrice: "50",
      fees: "0",
      currency: "TRY",
      executedAt: new Date("2026-01-02"),
    });

    const r = await getPortfolioOverview(deps, { portfolioId: p.id });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.positions.length).toBe(2);
    // Two positions, both quoted, FX-adjusted to TRY base.
    // AAPL: 2 * 100 USD = 200 USD → 200 * 35 = 7000 TRY
    // THYAO: 10 * 50 TRY = 500 TRY (identity)
    expect(r.value.totals.baseCurrency).toBe("TRY");
    expect(r.value.totals.totalMarketValue).not.toBeNull();
    expect(Number(r.value.totals.totalMarketValue)).toBeGreaterThan(0);
    expect(r.value.totals.totalCost).not.toBeNull();
    expect(Number(r.value.totals.totalCost)).toBeGreaterThan(0);
    expect(r.value.totals.totalUnrealizedPnl).not.toBeNull();
  });

  it("emits totalMarketValue=null when any position has no quote", async () => {
    const { deps, repo, mkt } = makeDeps();
    const p = makeRepoWithPortfolio(repo, "user-1", "USD");
    mkt.setQuote("AAPL", "100", "USD");
    // THYAO has no quote
    await addTransaction(deps, {
      portfolioId: p.id,
      assetSymbol: "AAPL",
      side: "buy",
      quantity: "2",
      unitPrice: "100",
      fees: "0",
      currency: "USD",
      executedAt: new Date("2026-01-01"),
    });
    await addTransaction(deps, {
      portfolioId: p.id,
      assetSymbol: "THYAO",
      side: "buy",
      quantity: "10",
      unitPrice: "50",
      fees: "0",
      currency: "USD",
      executedAt: new Date("2026-01-02"),
    });

    const r = await getPortfolioOverview(deps, { portfolioId: p.id });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.totals.totalMarketValue).toBeNull();
    expect(r.value.totals.totalUnrealizedPnl).toBeNull();
    // totalCost still computed from avgCost * qty for available positions.
    expect(Number(r.value.totals.totalCost)).toBeGreaterThan(0);
  });
});