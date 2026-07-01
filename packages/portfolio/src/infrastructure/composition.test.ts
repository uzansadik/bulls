/**
 * Infrastructure: composition root smoke-test.
 *
 * Verifies `createPortfolioServices(deps)` returns an object
 * exposing every use case and that deps flow through.
 */
import { describe, expect, it } from "vitest";
import { noopLogger } from "../domain/ports/logger.port";
import {
  InMemoryMarketDataGateway,
  InMemoryPortfolioRepository,
} from "../__tests__/repository.mock";
import { createPortfolioServices } from "./composition";

describe("createPortfolioServices", () => {
  it("exposes every use case and forwards deps.portfolios", async () => {
    const repo = new InMemoryPortfolioRepository();
    const mkt = new InMemoryMarketDataGateway();
    const services = createPortfolioServices({
      portfolios: repo,
      marketData: mkt,
      logger: noopLogger,
      now: () => new Date("2026-01-01"),
    });
    const keys = [
      "createPortfolio",
      "archivePortfolio",
      "addTransaction",
      "deleteTransaction",
      "recomputeHolding",
      "listTransactions",
      "getHoldings",
      "getPortfolioOverview",
      "getPortfolioPerformance",
      "importSnapshot",
    ] as const;
    for (const k of keys) {
      expect(services[k]).toBeTypeOf("function");
    }

    // Smoke: create portfolio via the service surface.
    const r = await services.createPortfolio({
      userId: "user-1",
      name: "Test",
      baseCurrency: "USD",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.baseCurrency).toBe("USD");
  });
});