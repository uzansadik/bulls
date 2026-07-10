/**
 * @openbulls/notifications — `sendNotification` orchestrator tests.
 *
 * The orchestrator is the only stateful command in the package — it
 * touches the channel repo (mocked), the sender registry (real), and
 * inserts one row per (channel × notification) pair into the
 * notification repo (mocked). We stub `find-user-channels.query`
 * directly so the test never touches Postgres.
 *
 * Coverage:
 *   - empty channel list → no-op, no insert
 *   - delivered → row inserted with status=sent
 *   - sender returns {delivered:false} → row inserted with status=failed
 *   - sender throws (defensive) → row inserted with status=failed,
 *     fan-out continues
 *   - unknown kind (no sender) → unsupportedKinds accumulates, no insert
 *   - multiple channels: 1 delivered + 1 unsupported → 1 sent + 1 logged
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Notification } from "@openbulls/db/schema/notifications.schema";
import type { ChannelConfig, NotificationTemplate } from "../domain";
import type {
  INotificationRepository,
  NewNotificationInput,
} from "../infrastructure/repositories/ports";
import type { ChannelSendResult, IChannelSender } from "./channels/ports";

// Stub the channels query BEFORE importing sendNotification so the
// dynamic `await import("./find-user-channels.query")` inside the
// orchestrator resolves to the mock.
const findUserChannels = vi.fn(async () => [] as never[]);

vi.mock("./find-user-channels.query", () => ({
  findUserChannels: (...args: unknown[]) =>
    (findUserChannels as (...a: unknown[]) => unknown)(...args),
}));

// Now safe to import the orchestrator + registry.
const { sendNotification } = await import("./send-notification.command");
const { InMemoryChannelRegistry } = await import("./channel-registry");

const noopLogger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

const fakeChannel = (id: string, kind: "telegram" | "email" = "telegram", isActive = true) =>
  ({
    id,
    userId: "u-1",
    kind,
    config:
      kind === "telegram"
        ? { kind: "telegram", config: { chatId: "999" } }
        : { kind: "email", config: { address: "x@y" } },
    isActive,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as never;

const captured: NewNotificationInput[] = [];
const fakeRepo: INotificationRepository = {
  insert: vi.fn(async (input: NewNotificationInput): Promise<Notification> => {
    captured.push(input);
    return { ...input, id: `n-${captured.length}` } as unknown as Notification;
  }),
  listByUser: async () => [],
  markRead: async () => undefined,
  getById: async () => null,
};

const deliveredSender = (
  kind: IChannelSender<ChannelConfig>["kind"],
): IChannelSender<ChannelConfig> => ({
  kind,
  send: async () => ({ delivered: true as const, sentAt: new Date() }),
});

const failedSender = (
  kind: IChannelSender<ChannelConfig>["kind"],
  error: string,
): IChannelSender<ChannelConfig> => ({
  kind,
  send: async () => ({ delivered: false, error, transient: true }) satisfies ChannelSendResult,
});

const throwingSender = (
  kind: IChannelSender<ChannelConfig>["kind"],
  message: string,
): IChannelSender<ChannelConfig> => ({
  kind,
  send: async () => {
    throw new Error(message);
  },
});

beforeEach(() => {
  captured.length = 0;
  findUserChannels.mockReset();
  vi.mocked(fakeRepo.insert).mockClear();
});

describe("sendNotification", () => {
  it("returns a zero-summary when the user has no active channels", async () => {
    findUserChannels.mockResolvedValueOnce([]);
    const registry = new InMemoryChannelRegistry();

    const summary = await sendNotification(
      {
        db: {} as never,
        registry,
        notificationRepo: fakeRepo,
        logger: noopLogger,
        now: () => new Date("2026-07-10T00:00:00Z"),
      },
      {
        userId: "u-1",
        kind: "price_alert",
        payload: { symbol: "THYAO", threshold: "120", last: "123", direction: "up" },
      },
    );

    expect(summary).toMatchObject({
      userId: "u-1",
      found: 0,
      sent: 0,
      failed: 0,
      unsupportedKinds: [],
    });
    expect(captured).toHaveLength(0);
  });

  it("persists a `sent` row when the sender reports delivered", async () => {
    findUserChannels.mockResolvedValueOnce([fakeChannel("c-1", "telegram")]);
    const registry = new InMemoryChannelRegistry([deliveredSender("telegram")]);

    const summary = await sendNotification(
      {
        db: {} as never,
        registry,
        notificationRepo: fakeRepo,
        logger: noopLogger,
        now: () => new Date(),
      },
      {
        userId: "u-1",
        kind: "price_alert",
        payload: { symbol: "THYAO", threshold: "120", last: "123", direction: "up" },
      },
    );

    expect(summary).toMatchObject({ found: 1, sent: 1, failed: 0 });
    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject({
      channelId: "c-1",
      kind: "price_alert",
      status: "sent",
      lastError: null,
    });
    expect(captured[0]?.sentAt).toBeInstanceOf(Date);
  });

  it("persists a `failed` row when the sender reports not delivered", async () => {
    findUserChannels.mockResolvedValueOnce([fakeChannel("c-1", "telegram")]);
    const registry = new InMemoryChannelRegistry([failedSender("telegram", "network blip")]);

    const summary = await sendNotification(
      {
        db: {} as never,
        registry,
        notificationRepo: fakeRepo,
        logger: noopLogger,
        now: () => new Date(),
      },
      {
        userId: "u-1",
        kind: "system",
        payload: { message: "hi" },
      },
    );

    expect(summary).toMatchObject({ found: 1, sent: 0, failed: 1 });
    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject({
      status: "failed",
      lastError: "network blip",
      sentAt: null,
    });
  });

  it("recovers from a sender throw (defensive: never lose the row)", async () => {
    findUserChannels.mockResolvedValueOnce([fakeChannel("c-1", "telegram")]);
    const registry = new InMemoryChannelRegistry([throwingSender("telegram", "boom")]);

    const summary = await sendNotification(
      {
        db: {} as never,
        registry,
        notificationRepo: fakeRepo,
        logger: noopLogger,
        now: () => new Date(),
      },
      {
        userId: "u-1",
        kind: "system",
        payload: { message: "hi" },
      },
    );

    expect(summary).toMatchObject({ found: 1, sent: 0, failed: 1 });
    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject({
      status: "failed",
      lastError: "boom",
    });
  });

  it("logs unsupported kinds when no sender is registered for them", async () => {
    // Channel with a kind the registry doesn't have — dispatcher
    // logs the gap and continues; future email sender can register.
    const emailChannel = fakeChannel("c-email", "email");
    findUserChannels.mockResolvedValueOnce([emailChannel]);
    // Only telegram sender registered.
    const registry = new InMemoryChannelRegistry([deliveredSender("telegram")]);

    const summary = await sendNotification(
      {
        db: {} as never,
        registry,
        notificationRepo: fakeRepo,
        logger: noopLogger,
        now: () => new Date(),
      },
      {
        userId: "u-1",
        kind: "system",
        payload: { message: "hi" },
      },
    );

    expect(summary.unsupportedKinds).toContain("email");
    expect(summary).toMatchObject({ found: 1, sent: 0, failed: 0 });
    expect(captured).toHaveLength(0); // no row for skipped channel
  });

  it("fans out across multiple channels (1 delivered + 1 unsupported)", async () => {
    findUserChannels.mockResolvedValueOnce([
      fakeChannel("c-1", "telegram"),
      fakeChannel("c-2", "email"),
    ]);
    const registry = new InMemoryChannelRegistry([deliveredSender("telegram")]);

    const summary = await sendNotification(
      {
        db: {} as never,
        registry,
        notificationRepo: fakeRepo,
        logger: noopLogger,
        now: () => new Date(),
      },
      {
        userId: "u-1",
        kind: "system",
        payload: { message: "hi" },
      },
    );

    expect(summary).toMatchObject({ found: 2, sent: 1, failed: 0 });
    expect(summary.unsupportedKinds).toEqual(["email"]);
    expect(captured).toHaveLength(1);
    expect(captured[0]?.channelId).toBe("c-1");
  });
});

// Reference the import so vitest + tsc don't flag the namespace as unused
// (NotificationTemplate is the in-memory shape the sender consumes).
const _tplShape: NotificationTemplate | null = null;
