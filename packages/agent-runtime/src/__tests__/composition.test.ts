/**
 * @openbulls/agent-runtime — CompiledGraphBundle smoke.
 *
 * This file currently covers the composition surface only. Full
 * end-to-end invoke coverage (with proper budget/state seeding) is
 * scheduled for a follow-up PR — see agent-runtime/README.
 */
import { MemorySaver } from "@langchain/langgraph";
import { describe, expect, it } from "vitest";

import {
  createCompiledGraphBundle,
  defaultGraphFactories,
  defaultGraphKeys,
  type IBillingGateway,
  type IJobsGateway,
  type IMarketDataGateway,
  type IPortfolioGateway,
  type LoggerLike,
} from "../index.js";
import { ok } from "@openbulls/shared";

const noopLogger: LoggerLike = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

const okBilling: IBillingGateway = {
  async reserveCredit() {
    return ok({ reservationId: "res-1", balanceAfter: "100" });
  },
  async finalizeUsage() {
    return ok({ reservationId: "res-1", finalCost: "0.01", balanceAfter: "99.99" });
  },
  async refundReservation() {
    return ok({ reservationId: "res-1", balanceAfter: "100" });
  },
};

const okJobs: IJobsGateway = {
  async enqueueAgentRun() {
    return ok({ jobId: "stub-job" });
  },
};

const okMarket: IMarketDataGateway = {
  async getQuote() {
    return { price: 1, symbol: "AAPL" };
  },
  async getCandles() {
    return { candles: [] };
  },
  async getFinancialStatements() {
    return { rows: [] };
  },
  async getNews() {
    return [];
  },
  async getFxRate() {
    return null;
  },
};

const okPortfolio: IPortfolioGateway = {
  async getPortfolioOverview() {
    return null;
  },
  async getHoldings() {
    return [];
  },
  async getPerformance() {
    return null;
  },
};

function buildBundle() {
  return createCompiledGraphBundle({
    factories: defaultGraphFactories,
    deps: {
      checkpointer: new MemorySaver(),
      billing: okBilling,
      marketData: okMarket,
      portfolio: okPortfolio,
      jobs: okJobs,
      logger: noopLogger,
      now: () => Date.now(),
    },
  });
}

describe("CompiledGraphBundle", () => {
  it("builds with the default factories and a MemorySaver", () => {
    const bundle = buildBundle();
    expect(bundle).toBeDefined();
    expect(Object.keys(bundle.graphs).sort()).toEqual(
      [...defaultGraphKeys].sort(),
    );
  });

  it("defaultGraphKeys is sorted and stable", () => {
    expect(defaultGraphKeys).toEqual([
      "company-analysis",
      "market-news",
      "portfolio-review",
      "report-writer",
    ]);
  });

  it("bundle exposes a BaseCheckpointSaver", () => {
    const bundle = buildBundle();
    expect(bundle.checkpointer).toBeDefined();
    expect(typeof bundle.checkpointer.get).toBe("function");
  });
});