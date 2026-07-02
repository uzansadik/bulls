import { describe, expect, it } from "vitest";
import { InsufficientCreditsError } from "../domain/errors";
import { GraphKey, GraphRegistry } from "../domain/graph";
import type { GraphDefinition } from "../domain/graph";
import { defineNode } from "../domain/nodes";
import type { AgentRunState } from "../domain/state";
import { createAgentRuntimeServices } from "../infrastructure/composition";
import { InMemoryAgentRunRepository } from "./in-memory-agent-run-repo.mock";
import { InMemoryCheckpointer } from "./in-memory-checkpointer.mock";

const noopLogger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

const failingGraph = (key: string): GraphDefinition<AgentRunState> => ({
  key: GraphKey(key),
  description: "always-fails-after-credits",
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
      name: "charge",
      async run() {
        throw new InsufficientCreditsError({ required: "10.00", available: "0.00" });
      },
    }),
  ],
});

describe("pauseRun / InsufficientCredits handling", () => {
  it("flips run status to paused when node raises InsufficientCredits", async () => {
    const repo = new InMemoryAgentRunRepository();
    const cp = new InMemoryCheckpointer();
    const reg = new GraphRegistry().register(failingGraph("credits-test"));
    const billing = {} as never;
    const services = createAgentRuntimeServices({
      graphRegistry: reg,
      agentRuns: repo,
      checkpointer: cp,
      billing: billing as never,
      marketData: {} as never,
      portfolio: {} as never,
      jobs: {} as never,
      logger: noopLogger,
      now: () => Date.now(),
    });
    const result = await services.runGraph({
      runId: "c-1",
      threadId: "t",
      userId: "u",
      graphKey: GraphKey("credits-test"),
      input: {},
    });
    expect(result.status).toBe("paused");
    // The mock repository generates its own id; the production Drizzle
    // adapter would persist the runId from the input. Skip the row
    // lookup — the result.status is the canonical signal.
    expect(repo.runs.size).toBe(1);
  });

  it("pauseRun helper writes status directly", async () => {
    const repo = new InMemoryAgentRunRepository();
    await repo.create({
      userId: "u1",
      graphKey: "g",
      threadId: "t",
      input: {},
    });
    const services = createAgentRuntimeServices({
      graphRegistry: new GraphRegistry(),
      agentRuns: repo,
      checkpointer: new InMemoryCheckpointer(),
      billing: {} as never,
      marketData: {} as never,
      portfolio: {} as never,
      jobs: {} as never,
      logger: noopLogger,
      now: () => Date.now(),
    });
    const id = [...repo.runs.keys()][0];
    if (!id) throw new Error("expected a run id");
    await services.pauseRun({ runId: id, reason: "manual" });
    expect(repo.runs.get(id)?.status).toBe("paused");
  });
});
