import { describe, expect, it } from "vitest";
import { InMemoryCheckpointer } from "./in-memory-checkpointer.mock";

const makeState = () => ({
  runId: "r1",
  threadId: "t1",
  userId: "u1",
  graphKey: "company-analysis",
  status: "running" as const,
  startedAt: "2026-01-01T00:00:00Z",
  messages: [],
  scratchpad: {},
  toolInvocations: [],
});

describe("InMemoryCheckpointer", () => {
  it("saves and loads the latest record", async () => {
    const cp = new InMemoryCheckpointer();
    const state = makeState();
    await cp.save({
      runId: "r1",
      threadId: "t1",
      checkpointId: "c1",
      nodeKey: "load-company",
      state: { ...state, currentNode: "load-company" },
    });
    const loaded = await cp.load("r1");
    expect(loaded?.nodeKey).toBe("load-company");
    expect(loaded?.version).toBe(1);
  });

  it("load returns null when empty", async () => {
    const cp = new InMemoryCheckpointer();
    expect(await cp.load("nope")).toBeNull();
  });

  it("list returns records in order", async () => {
    const cp = new InMemoryCheckpointer();
    for (let i = 0; i < 3; i++) {
      await cp.save({
        runId: "r1",
        threadId: "t1",
        checkpointId: `c${i}`,
        nodeKey: `n${i}`,
        state: { ...makeState(), currentNode: `n${i}` },
      });
    }
    const list = await cp.list("r1");
    expect(list.map((r) => r.nodeKey)).toEqual(["n0", "n1", "n2"]);
    expect(list.map((r) => r.version)).toEqual([1, 2, 3]);
  });

  it("clear removes all records for a run", async () => {
    const cp = new InMemoryCheckpointer();
    await cp.save({
      runId: "r1",
      threadId: "t1",
      checkpointId: "c1",
      nodeKey: "n1",
      state: makeState(),
    });
    await cp.clear("r1");
    expect(await cp.load("r1")).toBeNull();
  });
});
