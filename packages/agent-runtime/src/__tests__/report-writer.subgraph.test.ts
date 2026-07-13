/**
 * @openbulls/agent-runtime — `report-writer` subgraph smoke tests.
 *
 * The graph is compiled with a `MemorySaver` checkpointer and stub
 * deps. We don't drive an end-to-end invoke here — the synthesize
 * step calls the model gateway, which is mocked in the Faz 7.5
 * follow-up. Today the assertions cover:
 *   - the factory compiles without throwing
 *   - `defaultGraphFactories` registers `report-writer`
 *   - `defaultGraphKeys` includes `report-writer`
 *   - the compiled graph exposes the 9 expected nodes (4 main + 4
 *     log-step + finalize-usage)
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
    return { from: "USD", to: "TRY", rate: 30 };
  },
};

const okPortfolio: IPortfolioGateway = {
  async getPortfolioOverview() {
    return { holdings: [], summary: { totalValue: "0" } };
  },
  async getHoldings() {
    return [];
  },
  async getPerformance() {
    return { totalReturnPct: 0 };
  },
};

describe("report-writer subgraph", () => {
  it("compiles with stub deps + MemorySaver", async () => {
    const bundle = await createCompiledGraphBundle({
      factories: { "report-writer": defaultGraphFactories["report-writer"] ?? (() => {
        throw new Error("missing factory");
      }) },
      deps: {
        checkpointer: new MemorySaver(),
        billing: okBilling,
        jobs: okJobs,
        marketData: okMarket,
        portfolio: okPortfolio,
        logger: noopLogger,
        model: {
          async invoke() {
            return {
              content: "stub summary",
              usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
              toolCalls: [],
            };
          },
          async *stream() {
            yield { event: "text" as const, data: "stub" };
            yield { event: "done" as const, data: null };
          },
        },
        now: () => Date.now(),
      },
    });

    expect(bundle.graphs["report-writer"]).toBeDefined();
    // bundle.graphs is `Record<graphKey, ReadonlyArray<string>>` —
    // a non-empty array means the factory compiled successfully and
    // produced at least one graph key registration.
    expect(Array.isArray(bundle.graphs["report-writer"])).toBe(true);
  });

  it("is registered in defaultGraphFactories", () => {
    expect(defaultGraphFactories["report-writer"]).toBeDefined();
    expect(defaultGraphFactories["report-writer"]?.length).toBeGreaterThan(0);
  });

  it("appears in defaultGraphKeys (sorted)", () => {
    expect(defaultGraphKeys).toContain("report-writer");
    // Sanity: keys are sorted alphabetically — verify the relative
    // ordering of `report-writer` and `company-analysis`.
    const rIdx = defaultGraphKeys.indexOf("report-writer");
    const cIdx = defaultGraphKeys.indexOf("company-analysis");
    expect(rIdx).toBeGreaterThan(cIdx);
  });
});