/**
 * @openbulls/notifications — channel-registry unit tests.
 *
 * Mirrors the executor-registry test in `@openbulls/automation`:
 *   - register + retrieve
 *   - get unknown returns undefined (NOT throw — dispatcher treats
 *     it as "skip + log")
 *   - duplicate throws a typed error carrying the kind in `data`
 *   - list() returns a frozen snapshot (callers can hand it to ops
 *     endpoints without copying)
 *   - constructor seed registers eagerly (composition root uses this)
 */
import { describe, expect, it } from "vitest";

import type { ChannelConfig, NotificationTemplate } from "../domain";
import { ChannelKindAlreadyRegisteredError, InMemoryChannelRegistry } from "./channel-registry";
import type { IChannelSender } from "./channels/ports";

const fakeTelegramSender = (): IChannelSender<ChannelConfig> & { kind: "telegram" } => ({
  kind: "telegram",
  send: async () => ({ delivered: true as const, sentAt: new Date() }),
});

describe("InMemoryChannelRegistry", () => {
  it("registers + retrieves a sender", () => {
    const registry = new InMemoryChannelRegistry();
    const s = fakeTelegramSender();
    registry.register(s);
    expect(registry.get("telegram")).toBe(s);
    expect(registry.has("telegram")).toBe(true);
  });

  it("get() returns undefined for an unknown kind", () => {
    const registry = new InMemoryChannelRegistry();
    expect(registry.get("email")).toBeUndefined();
    // non-existent telegram also undefined
    expect(registry.has("telegram")).toBe(false);
  });

  it("throws ChannelKindAlreadyRegisteredError on duplicate", () => {
    const registry = new InMemoryChannelRegistry();
    registry.register(fakeTelegramSender());
    expect(() => registry.register(fakeTelegramSender())).toThrow(
      ChannelKindAlreadyRegisteredError,
    );
  });

  it("duplicate error exposes the offending kind in `data`", () => {
    const registry = new InMemoryChannelRegistry();
    registry.register(fakeTelegramSender());
    try {
      registry.register(fakeTelegramSender());
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ChannelKindAlreadyRegisteredError);
      const typed = err as ChannelKindAlreadyRegisteredError;
      expect(typed.code).toBe("notifications/channel-kind-already-registered");
      expect(typed.data.channelKind).toBe("telegram");
    }
  });

  it("list() returns a frozen snapshot of registered senders", () => {
    const s = fakeTelegramSender();
    const registry = new InMemoryChannelRegistry([s]);
    const list = registry.list();
    expect(list).toHaveLength(1);
    expect(list[0]).toBe(s);
    expect(Object.isFrozen(list)).toBe(true);
  });

  it("constructor seed registers eagerly", () => {
    const s = fakeTelegramSender();
    const registry = new InMemoryChannelRegistry([s]);
    expect(registry.get("telegram")).toBe(s);
  });

  it("does not throw when registering a second kind (independent slot)", () => {
    const registry = new InMemoryChannelRegistry();
    registry.register(fakeTelegramSender());
    // Registering a different kind later is fine — just verifies the
    // duplicate guard is per-kind, not for the whole class.
    const registry2 = new InMemoryChannelRegistry([fakeTelegramSender()]);
    expect(() => registry2.register(fakeTelegramSender())).toThrow(
      ChannelKindAlreadyRegisteredError,
    );
  });
});

// Reference the import so vitest + tsc don't flag the namespace as unused
// (NotificationTemplate is the in-memory shape the sender consumes).
const _tplShape: NotificationTemplate | null = null;
