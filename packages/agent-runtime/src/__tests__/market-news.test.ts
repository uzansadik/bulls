import { describe, expect, it } from "vitest";
import { GraphKey, GraphRegistry } from "../domain/graph";
import type { IMarketDataGateway } from "../domain/ports/market-data-gateway.port";
import { createAgentRuntimeServices } from "../infrastructure/composition";
import { marketNewsGraph } from "../subgraphs/market-news.subgraph";
import { InMemoryAgentRunRepository } from "./in-memory-agent-run-repo.mock";
import { InMemoryCheckpointer } from "./in-memory-checkpointer.mock";

const noopLogger = { info: () => undefined, warn: () => undefined, error: () => undefined };

describe("market-news subgraph", () => {
  it("registers and has 8 nodes (4 main + 4 log-step)", () => {
    expect(marketNewsGraph.nodes.length).toBe(8);
    expect(marketNewsGraph.idempotentNodes?.size).toBe(4);
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
      billing: {} as never,
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
      input: { symbols: ["AAPL", "MSFT"], limit: 5 },
    });
    if (result.status !== "completed") {
      process.stdout.write(`DEBUG ${JSON.stringify(result)}\n`);
    }
    expect(result.status).toBe("completed");
  });
});
