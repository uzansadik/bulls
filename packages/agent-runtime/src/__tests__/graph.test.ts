import { describe, expect, it } from "vitest";
import { DuplicateGraphError, UnknownGraphError } from "../domain/errors";
import { GraphKey, GraphRegistry } from "../domain/graph";
import type { GraphDefinition } from "../domain/graph";
import type { AgentRunState } from "../domain/state";

const dummyGraph = (key: string): GraphDefinition<AgentRunState> => ({
  key: GraphKey(key),
  description: `dummy ${key}`,
  buildState: () => ({}) as AgentRunState,
  nodes: [],
});

describe("GraphRegistry", () => {
  it("registers and finds a graph", () => {
    const reg = new GraphRegistry();
    reg.register(dummyGraph("a"));
    expect(reg.find(GraphKey("a"))).toBeDefined();
    expect(reg.find(GraphKey("a")).key).toBe(GraphKey("a"));
  });

  it("throws UnknownGraphError on missing key", () => {
    const reg = new GraphRegistry();
    expect(() => reg.find(GraphKey("missing"))).toThrow(UnknownGraphError);
  });

  it("throws DuplicateGraphError on double registration", () => {
    const reg = new GraphRegistry();
    reg.register(dummyGraph("a"));
    expect(() => reg.register(dummyGraph("a"))).toThrow(DuplicateGraphError);
  });

  it("returns sorted keys from list()", () => {
    const reg = new GraphRegistry();
    reg.register(dummyGraph("b"));
    reg.register(dummyGraph("a"));
    reg.register(dummyGraph("c"));
    expect(reg.list()).toEqual([GraphKey("a"), GraphKey("b"), GraphKey("c")]);
  });

  it("size tracks registered count", () => {
    const reg = new GraphRegistry();
    expect(reg.size).toBe(0);
    reg.register(dummyGraph("x"));
    reg.register(dummyGraph("y"));
    expect(reg.size).toBe(2);
  });
});
