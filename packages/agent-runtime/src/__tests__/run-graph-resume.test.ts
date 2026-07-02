import { describe, expect, it } from "vitest";
import { GraphKey, GraphRegistry } from "../domain/graph";
import type { GraphDefinition } from "../domain/graph";
import { defineNode } from "../domain/nodes";
import type { AgentRunState } from "../domain/state";
import { createAgentRuntimeServices } from "../infrastructure/composition";
import { InMemoryAgentRunRepository } from "./in-memory-agent-run-repo.mock";
import { InMemoryCheckpointer } from "./in-memory-checkpointer.mock";

const noopLogger = { info: () => undefined, warn: () => undefined, error: () => undefined };

// 3-step graph that we can break on the second node to simulate resume.
const resumableGraph = (key: string): GraphDefinition<AgentRunState> => ({
  key: GraphKey(key),
  description: "resumable",
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
        return { scratchpad: { ...state.scratchpad, s1: true }, currentNode: "step-1" };
      },
    }),
    defineNode<AgentRunState>({
      name: "step-2",
      async run(state) {
        return { scratchpad: { ...state.scratchpad, s2: true }, currentNode: "step-2" };
      },
    }),
    defineNode<AgentRunState>({
      name: "step-3",
      async run(state) {
        return { scratchpad: { ...state.scratchpad, s3: true }, currentNode: "step-3" };
      },
    }),
  ],
});

describe("runGraph resume semantics", () => {
  it("resumes from latest snapshot after partial run", async () => {
    const repo = new InMemoryAgentRunRepository();
    const cp = new InMemoryCheckpointer();
    const reg = new GraphRegistry().register(resumableGraph("resume-test"));
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
    // Partial: manually save a checkpoint after step-1
    const partialState = {
      runId: "rr-1",
      threadId: "rt-1",
      userId: "ru-1",
      graphKey: "resume-test",
      status: "running" as const,
      startedAt: new Date().toISOString(),
      messages: [],
      scratchpad: { s1: true },
      toolInvocations: [],
      currentNode: "step-1",
    };
    await cp.save({
      runId: "rr-1",
      threadId: "rt-1",
      checkpointId: "rr-1:1",
      nodeKey: "step-1",
      state: partialState,
      nextNodes: ["step-2"],
    });
    await repo.create({
      userId: "ru-1",
      graphKey: "resume-test",
      threadId: "rt-1",
      input: {},
    });
    // Resume — should pick up from step-2
    const result = await services.resumeRun({
      runId: "rr-1",
      threadId: "rt-1",
      userId: "ru-1",
      graphKey: GraphKey("resume-test"),
      input: {},
    });
    expect(result.status).toBe("completed");
    const list = await cp.list("rr-1");
    // We wrote 1 (initial) + 2 (step-2, step-3) = 3
    expect(list.length).toBe(3);
  });

  it("returns 'no checkpoint to resume' when snapshot missing", async () => {
    const repo = new InMemoryAgentRunRepository();
    const cp = new InMemoryCheckpointer();
    const reg = new GraphRegistry().register(resumableGraph("resume-test"));
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
    const result = await services.resumeRun({
      runId: "missing",
      threadId: "t",
      userId: "u",
      graphKey: GraphKey("resume-test"),
      input: {},
    });
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.error).toMatch(/no checkpoint/i);
    }
  });
});
