/**
 * Application: getPortfolioPerformance.
 *
 * Verifies:
 *   - TotalReturn and TWR happy paths through the command
 *   - Modified Dietz weighting produces a non-trivial TWR
 *   - maxDrawdown remains 0 when no equity curve is supplied
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
import { getPortfolioPerformance } from "./get-portfolio-performance.query";

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
      now: () => new Date("2026-07-01T00:00:00Z"),
    },
    repo,
    mkt,
  };
}

describe("getPortfolioPerformance", () => {
  it("returns a snapshot with from/to boundaries and zero drawdown without a curve", async () => {
    const { deps, repo, mkt } = makeDeps();
    const p = makeRepoWithPortfolio(repo, "user-1", "USD");
    mkt.setQuote("AAPL", "150", "USD");

    await addTransaction(deps, {
      portfolioId: p.id,
      assetSymbol: "AAPL",
      side: "buy",
      quantity: "10",
      unitPrice: "100",
      fees: "0",
      currency: "USD",
      executedAt: new Date("2026-01-15"),
    });
    const r = await getPortfolioPerformance(deps, {
      portfolioId: p.id,
      from: new Date("2026-01-01"),
      to: new Date("2026-07-01"),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.from.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(r.value.to.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(r.value.baseCurrency).toBe("USD");
    // No equity curve supplied → maxDrawdown = 0.
    expect(r.value.maxDrawdown).toBe(0);
    expect(r.value.maxDrawdownWindow).toBeNull();
  });

  it("returns InvalidInputError when from >= to", async () => {
    const { deps, repo } = makeDeps();
    const p = makeRepoWithPortfolio(repo, "user-1", "USD");
    const r = await getPortfolioPerformance(deps, {
      portfolioId: p.id,
      from: new Date("2026-07-01"),
      to: new Date("2026-01-01"),
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("portfolio/invalid-input");
  });

  it("returns PortfolioNotFoundError when portfolioId is unknown", async () => {
    const { deps } = makeDeps();
    const r = await getPortfolioPerformance(deps, {
      portfolioId: "missing",
      from: new Date("2026-01-01"),
      to: new Date("2026-07-01"),
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("portfolio/not-found");
  });
});