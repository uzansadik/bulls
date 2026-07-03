/**
 * @openbulls/automation — executor-registry unit tests.
 */
import { describe, expect, it } from "vitest";

import { ExecutorAlreadyRegisteredError, type IExecutor } from "../domain";
import { InMemoryExecutorRegistry } from "./executor-registry";

const fakeExecutor = (type: "portfolio_daily_review" | "custom_agent"): IExecutor => ({
  type,
  buildPayload: () => undefined,
  run: async () => ({ kind: "noop", downstreamJobIds: [] }),
});

describe("InMemoryExecutorRegistry", () => {
  it("registers + retrieves an executor", () => {
    const registry = new InMemoryExecutorRegistry();
    const e = fakeExecutor("custom_agent");
    registry.register(e);
    expect(registry.get("custom_agent")).toBe(e);
    expect(registry.has("custom_agent")).toBe(true);
  });

  it("returns undefined for unknown type", () => {
    const registry = new InMemoryExecutorRegistry();
    expect(registry.get("price_alert")).toBeUndefined();
    expect(registry.has("price_alert")).toBe(false);
  });

  it("throws on duplicate register", () => {
    const registry = new InMemoryExecutorRegistry();
    registry.register(fakeExecutor("custom_agent"));
    expect(() => registry.register(fakeExecutor("custom_agent"))).toThrow(
      ExecutorAlreadyRegisteredError,
    );
  });

  it("list() returns a frozen snapshot", () => {
    const registry = new InMemoryExecutorRegistry([fakeExecutor("custom_agent")]);
    const list = registry.list();
    expect(list).toHaveLength(1);
    expect(Object.isFrozen(list)).toBe(true);
  });

  it("accepts a seed in the constructor", () => {
    const e = fakeExecutor("portfolio_daily_review");
    const registry = new InMemoryExecutorRegistry([e]);
    expect(registry.get("portfolio_daily_review")).toBe(e);
  });
});
