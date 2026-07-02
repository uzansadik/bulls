import { describe, expect, it } from "vitest";
import { GraphKey, GraphRegistry } from "../domain/graph";
import type { GraphDefinition } from "../domain/graph";
import { defineNode } from "../domain/nodes";
import type { IBillingGateway } from "../domain/ports/billing-gateway.port";
import type { IMarketDataGateway } from "../domain/ports/market-data-gateway.port";
import type { AgentRunState } from "../domain/state";
import { createAgentRuntimeServices } from "../infrastructure/composition";
import { companyAnalysisGraph } from "../subgraphs/company-analysis.subgraph";
import { InMemoryAgentRunRepository } from "./in-memory-agent-run-repo.mock";
import { InMemoryCheckpointer } from "./in-memory-checkpointer.mock";

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

const noopLogger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

// Helper: one-pass graph that just appends to scratchpad and returns "ok"
const okGraph = (key: string): GraphDefinition<AgentRunState> => ({
  key: GraphKey(key),
  description: "ok",
  buildState: ({ runId, threadId, userId }) =>
    ({
      runId,
      threadId,
      userId,
      graphKey: key,
      status: "running",
      startedAt: new Date().toISOString(),
      messages: [],
      scratchpad: {},
      toolInvocations: [],
    }) as AgentRunState,
  nodes: [
    defineNode<AgentRunState>({
      name: "step-1",
      async run(state) {
        return {
          scratchpad: { ...state.scratchpad, step1Ran: true },
          currentNode: "step-1",
        };
      },
    }),
    defineNode<AgentRunState>({
      name: "step-2",
      async run(state) {
        return {
          scratchpad: { ...state.scratchpad, step2Ran: true },
          currentNode: "step-2",
        };
      },
    }),
  ],
});

describe("subgraph smoke — company-analysis", () => {
  it("registers and produces a typed GraphDefinition", () => {
    const reg = new GraphRegistry();
    reg.register(companyAnalysisGraph);
    const g = reg.find(GraphKey("company-analysis"));
    expect(g.nodes.length).toBeGreaterThan(0);
    expect(g.buildState).toBeTypeOf("function");
  });

  it("runs an end-to-end subgraph with mocked market-data", async () => {
    const repo = new InMemoryAgentRunRepository();
    const cp = new InMemoryCheckpointer();
    const md: Pick<
      IMarketDataGateway,
      "getQuote" | "getCandles" | "getFinancialStatements" | "getNews"
    > = {
      getQuote: async () => ({ price: 42, symbol: "THYAO" }),
      getCandles: async () => ({ candles: [] }),
      getFinancialStatements: async () => ({ rows: [] }),
      getNews: async () => [
        { headline: "Test", symbol: "THYAO", publishedAt: "2026-01-01T00:00:00Z" },
      ],
    };
    const services = createAgentRuntimeServices({
      graphRegistry: new GraphRegistry().register(companyAnalysisGraph),
      agentRuns: repo,
      checkpointer: cp,
      billing: okBilling,
      marketData: md as never,
      portfolio: {
        getPortfolioOverview: async () => null,
        getHoldings: async () => [],
        getPerformance: async () => null,
      } as never,
      jobs: {} as never,
      logger: noopLogger,
      now: () => Date.now(),
    });
    const result = await services.runGraph({
      runId: "run-1",
      threadId: "thread-1",
      userId: "user-1",
      graphKey: GraphKey("company-analysis"),
      input: { symbol: "THYAO", estimatedCostUsd: "0.01" },
    });
    expect(result.status).toBe("completed");
    expect(repo.runs.size).toBe(1);
  });

  it("smoke: registers an arbitrary graph and completes it", async () => {
    const reg = new GraphRegistry().register(okGraph("smoke"));
    const repo = new InMemoryAgentRunRepository();
    const cp = new InMemoryCheckpointer();
    const services = createAgentRuntimeServices({
      graphRegistry: reg,
      agentRuns: repo,
      checkpointer: cp,
      billing: {} as never,
      marketData: {} as never,
      portfolio: {} as never,
      jobs: {} as never,
      logger: noopLogger,
      now: () => Date.now(),
    });
    const result = await services.runGraph({
      runId: "r2",
      threadId: "t2",
      userId: "u2",
      graphKey: GraphKey("smoke"),
      input: {},
    });
    expect(result.status).toBe("completed");
    expect(await cp.list("r2")).toHaveLength(2);
  });
});
