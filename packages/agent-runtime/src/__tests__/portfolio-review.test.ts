import { describe, expect, it } from "vitest";
import { GraphKey, GraphRegistry } from "../domain/graph";
import type { IBillingGateway } from "../domain/ports/billing-gateway.port";
import type { IPortfolioGateway } from "../domain/ports/portfolio-gateway.port";
import { createAgentRuntimeServices } from "../infrastructure/composition";
import { portfolioReviewGraph } from "../subgraphs/portfolio-review.subgraph";
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

describe("portfolio-review subgraph", () => {
  it("registers and has 14 nodes (7 main incl. billing guards + 7 log-step)", () => {
    expect(portfolioReviewGraph.nodes.length).toBe(14);
    expect(portfolioReviewGraph.idempotentNodes?.size).toBe(7);
  });

  it("runs end-to-end with mocked portfolio gateway", async () => {
    const repo = new InMemoryAgentRunRepository();
    const cp = new InMemoryCheckpointer();
    const portfolio: Pick<
      IPortfolioGateway,
      "getPortfolioOverview" | "getHoldings" | "getPerformance"
    > = {
      getPortfolioOverview: async () => ({
        portfolioId: "p1",
        holdings: [
          { symbol: "AAPL", weight: 0.5 },
          { symbol: "MSFT", weight: 0.5 },
        ],
      }),
      getHoldings: async () => [],
      getPerformance: async () => ({
        maxDrawdownPct: 0.25,
        totalReturn: 0.1,
      }),
    };
    const services = createAgentRuntimeServices({
      graphRegistry: new GraphRegistry().register(portfolioReviewGraph),
      agentRuns: repo,
      checkpointer: cp,
      billing: okBilling,
      marketData: {} as never,
      portfolio: portfolio as never,
      jobs: {} as never,
      logger: noopLogger,
      now: () => Date.now(),
    });
    const result = await services.runGraph({
      runId: "pr-1",
      threadId: "pt-1",
      userId: "pu-1",
      graphKey: GraphKey("portfolio-review"),
      input: { portfolioId: "p1", estimatedCostUsd: "0.01" },
    });
    expect(result.status).toBe("completed");
    expect(repo.runs.size).toBe(1);
  });
});
