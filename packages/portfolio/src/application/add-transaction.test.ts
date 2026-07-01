/**
 * Application: addTransaction.
 *
 * Verifies:
 *   - buy recomputes avgCost via the pure helper
 *   - sell accumulates realizedPnl (proceeds - costOfSold)
 *   - oversell returns InvalidTransactionError surfaced as PortfolioError
 *   - archived portfolio returns ArchivedPortfolioError
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

function makeDeps(): PortfolioDeps & {
  repo: InMemoryPortfolioRepository;
  mkt: InMemoryMarketDataGateway;
} {
  const repo = new InMemoryPortfolioRepository();
  const mkt = new InMemoryMarketDataGateway();
  return {
    repo,
    mkt,
    portfolios: repo,
    marketData: mkt,
    logger: noopLogger,
    now: () => new Date("2026-01-15T10:00:00Z"),
  };
}

describe("addTransaction", () => {
  it("inserts a buy and recomputes avgCost via the pure helper", async () => {
    const ctx = makeDeps();
    const p = makeRepoWithPortfolio(ctx.repo);
    const r = await addTransaction(ctx, {
      portfolioId: p.id,
      assetSymbol: "AAPL",
      side: "buy",
      quantity: "10",
      unitPrice: "100",
      fees: "5",
      currency: "USD",
      executedAt: new Date("2026-01-15T10:00:00Z"),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.holding.quantity).toBe("10.00000000");
    // avgCost = (10*100 + 5) / 10 = 100.5
    expect(r.value.holding.avgCost).toBe("100.50000000");
  });

  it("inserts a sell and accumulates realizedPnl", async () => {
    const ctx = makeDeps();
    const p = makeRepoWithPortfolio(ctx.repo);
    // First buy to set up the holding.
    await addTransaction(ctx, {
      portfolioId: p.id,
      assetSymbol: "AAPL",
      side: "buy",
      quantity: "10",
      unitPrice: "100",
      fees: "0",
      currency: "USD",
      executedAt: new Date("2026-01-10T10:00:00Z"),
    });
    // Then sell.
    const r = await addTransaction(ctx, {
      portfolioId: p.id,
      assetSymbol: "AAPL",
      side: "sell",
      quantity: "4",
      unitPrice: "130",
      fees: "0",
      currency: "USD",
      executedAt: new Date("2026-02-01T10:00:00Z"),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.holding.quantity).toBe("6.00000000");
    expect(r.value.holding.avgCost).toBe("100.00000000");
    // (130-100)*4 = 120
    expect(r.value.holding.realizedPnl).toBe("120.00000000");
  });

  it("returns PortfolioNotFoundError when portfolio does not exist", async () => {
    const ctx = makeDeps();
    const r = await addTransaction(ctx, {
      portfolioId: "missing",
      assetSymbol: "AAPL",
      side: "buy",
      quantity: "1",
      unitPrice: "1",
      fees: "0",
      currency: "USD",
      executedAt: new Date(),
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("portfolio/not-found");
  });

  it("returns ArchivedPortfolioError when portfolio is archived", async () => {
    const ctx = makeDeps();
    const p = makeRepoWithPortfolio(ctx.repo);
    await ctx.repo.archive(p.id);
    const r = await addTransaction(ctx, {
      portfolioId: p.id,
      assetSymbol: "AAPL",
      side: "buy",
      quantity: "1",
      unitPrice: "1",
      fees: "0",
      currency: "USD",
      executedAt: new Date(),
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("portfolio/archived");
  });

  it("returns InvalidTransactionError on oversell", async () => {
    const ctx = makeDeps();
    const p = makeRepoWithPortfolio(ctx.repo);
    await addTransaction(ctx, {
      portfolioId: p.id,
      assetSymbol: "AAPL",
      side: "buy",
      quantity: "5",
      unitPrice: "100",
      fees: "0",
      currency: "USD",
      executedAt: new Date("2026-01-01T00:00:00Z"),
    });
    const r = await addTransaction(ctx, {
      portfolioId: p.id,
      assetSymbol: "AAPL",
      side: "sell",
      quantity: "10",
      unitPrice: "120",
      fees: "0",
      currency: "USD",
      executedAt: new Date("2026-02-01T00:00:00Z"),
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("portfolio/invalid-transaction");
  });
});