import { describe, expect, it } from "vitest";
import { GraphKey, GraphRegistry } from "../domain/graph";
import type { IBillingGateway } from "../domain/ports/billing-gateway.port";
import type { IMarketDataGateway } from "../domain/ports/market-data-gateway.port";
import { createAgentRuntimeServices } from "../infrastructure/composition";
import { marketNewsGraph } from "../subgraphs/market-news.subgraph";
import { InMemoryAgentRunRepository } from "./in-memory-agent-run-repo.mock";
import { InMemoryCheckpointer } from "./in-memory-checkpointer.mock";

const noopLogger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

const okBilling: IBillingGateway = {
  reserveCredit: async () => ({
    ok: true,
    value: { reservationId: "res-1", balanceAfter: "100" },
  }),
  finalizeUsage: async () => ({
    ok: true,
    value: { reservationId: "res-1", finalCost: "0.01", balanceAfter: "99.99" },
  }),
  refundReservation: async () => ({
    ok: true,
    value: { reservationId: "res-1", balanceAfter: "100" },
  }),
};

describe("market-news subgraph", () => {
  it("registers and has 12 nodes (6 main incl. billing guards + 6 log-step)", () => {
    expect(marketNewsGraph.nodes.length).toBe(12);
    expect(marketNewsGraph.idempotentNodes?.size).toBe(6);
  });

  it("runs end-to-end with mocked market-data news", async () => {
    const repo = new InMemoryAgentRunRepository();
    const cp = new InMemoryCheckpointer();
    const md: Pick<IMarketDataGateway, "getNews"> = {
      getNews: async () => [
        { headline: "AAPL beats earnings", symbol: "AAPL", publishedAt: "2026-01-01T00:00:00Z" },
        { headline: "AAPL announces buyback", symbol: "AAPL", publishedAt: "2026-01-02T00:00:00Z" },
        { headline: "MSFT cloud growth", symbol: "MSFT", publishedAt: "2026-01-03T00:00:00Z" },
      ],
    };
    const services = createAgentRuntimeServices({
      graphRegistry: new GraphRegistry().register(marketNewsGraph),
      agentRuns: repo,
      checkpointer: cp,
      billing: okBilling,
      marketData: md as never,
      portfolio: {} as never,
      jobs: {} as never,
      logger: noopLogger,
      now: () => Date.now(),
    });
    const result = await services.runGraph({
      runId: "mn-1",
      threadId: "mt-1",
      userId: "mu-1",
      graphKey: GraphKey("market-news"),
      input: { symbols: ["AAPL", "MSFT"], limit: 5, estimatedCostUsd: "0.01" },
    });
    if (result.status !== "completed") {
      process.stdout.write(`DEBUG ${JSON.stringify(result)}\n`);
    }
    expect(result.status).toBe("completed");
  });
});
