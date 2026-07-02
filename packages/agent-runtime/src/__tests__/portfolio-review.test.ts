import { describe, expect, it } from "vitest";
import { GraphKey, GraphRegistry } from "../domain/graph";
import type { IPortfolioGateway } from "../domain/ports/portfolio-gateway.port";
import { createAgentRuntimeServices } from "../infrastructure/composition";
import { portfolioReviewGraph } from "../subgraphs/portfolio-review.subgraph";
import { InMemoryAgentRunRepository } from "./in-memory-agent-run-repo.mock";
import { InMemoryCheckpointer } from "./in-memory-checkpointer.mock";

const noopLogger = { info: () => undefined, warn: () => undefined, error: () => undefined };

describe("portfolio-review subgraph", () => {
  it("registers and has 10 nodes (5 main + 5 log-step)", () => {
    expect(portfolioReviewGraph.nodes.length).toBe(10);
    expect(portfolioReviewGraph.idempotentNodes?.size).toBe(5);
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
      billing: {} as never,
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
      input: { portfolioId: "p1" },
    });
    expect(result.status).toBe("completed");
    expect(repo.runs.size).toBe(1);
  });
});
