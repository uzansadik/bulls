import { describe, expect, it } from "vitest";
import { GraphKey, GraphRegistry } from "../domain/graph";
import { createAgentRuntimeServices } from "../infrastructure/composition";
import { InMemoryAgentRunRepository } from "./in-memory-agent-run-repo.mock";
import { InMemoryCheckpointer } from "./in-memory-checkpointer.mock";

const noopLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

describe("createAgentRuntimeServices", () => {
  it("returns the full service surface", () => {
    const repo = new InMemoryAgentRunRepository();
    const cp = new InMemoryCheckpointer();
    const services = createAgentRuntimeServices({
      graphRegistry: new GraphRegistry(),
      agentRuns: repo,
      checkpointer: cp,
      billing: {} as never,
      marketData: {} as never,
      portfolio: {} as never,
      jobs: {} as never,
      logger: noopLogger,
      now: () => Date.now(),
    });
    expect(services.runGraph).toBeTypeOf("function");
    expect(services.pauseRun).toBeTypeOf("function");
    expect(services.resumeRun).toBeTypeOf("function");
    expect(services.graphRegistry).toBeInstanceOf(GraphRegistry);
  });

  it("exposes the registry passed in", () => {
    const reg = new GraphRegistry();
    const services = createAgentRuntimeServices({
      graphRegistry: reg,
      agentRuns: new InMemoryAgentRunRepository(),
      checkpointer: new InMemoryCheckpointer(),
      billing: {} as never,
      marketData: {} as never,
      portfolio: {} as never,
      jobs: {} as never,
      logger: noopLogger,
      now: () => Date.now(),
    });
    expect(services.graphRegistry).toBe(reg);
    expect(
      services.graphRegistry.find.bind(services.graphRegistry, GraphKey("missing")),
    ).toBeTypeOf("function");
  });
});
