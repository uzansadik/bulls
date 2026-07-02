/**
 * @openbulls/agent-runtime — Annotation ↔ AgentRunState round-trip.
 *
 * Ensures `agentRunStateToAnnotation` only emits set fields (no
 * `undefined` for optional slots), and `annotationStateToAgentRunState`
 * tolerates the LangGraph yield shape without throwing.
 */
import { describe, expect, it } from "vitest";

import {
  agentRunStateToAnnotation,
  annotationStateToAgentRunState,
} from "../domain/state-helpers";
import { parseAgentRunState } from "../domain/state";

describe("state-helpers round-trip", () => {
  it("strips undefined optionals on toAnnotation", () => {
    const initial = parseAgentRunState({
      runId: "r1",
      threadId: "t1",
      userId: "u1",
      graphKey: "company-analysis",
      status: "running",
      startedAt: new Date().toISOString(),
    });
    const seeded = agentRunStateToAnnotation(initial);
    expect("currentNode" in seeded).toBe(false);
    expect("nextNode" in seeded).toBe(false);
    expect("finishedAt" in seeded).toBe(false);
    expect("error" in seeded).toBe(false);
    expect(seeded.runId).toBe("r1");
  });

  it("tolerates a LangGraph-shaped yield", () => {
    const annotationYield = {
      runId: "r2",
      threadId: "t2",
      userId: "u2",
      graphKey: "market-news",
      status: "completed",
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      messages: [],
      scratchpad: { symbols: ["AAPL"] },
      toolInvocations: [],
      currentNode: "finalize-usage",
    };
    const roundTripped = annotationStateToAgentRunState(annotationYield);
    expect(roundTripped.runId).toBe("r2");
    expect(roundTripped.status).toBe("completed");
    expect(roundTripped.scratchpad).toEqual({ symbols: ["AAPL"] });
    expect(roundTripped.currentNode).toBe("finalize-usage");
  });
});