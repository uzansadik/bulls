import { describe, expect, it } from "vitest";
import { parseAgentRunState, safeParseAgentRunState } from "../domain/state";

describe("agentRunStateSchema", () => {
  it("parses a valid state with defaults", () => {
    const state = parseAgentRunState({
      runId: "r1",
      threadId: "t1",
      userId: "u1",
      graphKey: "company-analysis",
      status: "running",
      startedAt: "2026-01-01T00:00:00Z",
    });
    expect(state.messages).toEqual([]);
    expect(state.scratchpad).toEqual({});
    expect(state.toolInvocations).toEqual([]);
  });

  it("rejects missing required fields", () => {
    const res = safeParseAgentRunState({ runId: "r1" });
    expect(res.success).toBe(false);
  });

  it("rejects unknown status values", () => {
    const res = safeParseAgentRunState({
      runId: "r1",
      threadId: "t1",
      userId: "u1",
      graphKey: "k",
      status: "weird",
      startedAt: "2026-01-01T00:00:00Z",
    });
    expect(res.success).toBe(false);
  });

  it("accepts optional budget + usage", () => {
    const state = parseAgentRunState({
      runId: "r1",
      threadId: "t1",
      userId: "u1",
      graphKey: "k",
      status: "completed",
      startedAt: "2026-01-01T00:00:00Z",
      budget: { estimatedCost: "1.50" },
      usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3, costUsd: "0.01" },
    });
    expect(state.budget?.estimatedCost).toBe("1.50");
    expect(state.usage?.totalTokens).toBe(3);
  });
});
