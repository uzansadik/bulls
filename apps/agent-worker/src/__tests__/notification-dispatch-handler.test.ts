/**
 * apps/agent-worker — `notification-dispatch` handler smoke tests.
 *
 * Mocks `NotificationServices.sendNotification`. We never touch
 * Postgres, Telegram, or BullMQ.
 *
 * Coverage:
 *   - happy path: send returns a normal summary → info log + no warn
 *   - unsupported kinds propagate through summary → warn log emitted
 *   - sendNotification throws → handler re-throws so BullMQ retries
 */
import { describe, expect, it, vi } from "vitest";

import type { LoggerLike } from "@openbulls/agent-runtime";
import type {
  NotificationServices,
  DispatchSummary,
} from "@openbulls/notifications";
import { JobIdValue, type NotificationDispatchJob } from "@openbulls/jobs";

import { makeNotificationDispatchHandler } from "../notification-dispatch-handler";

const logged: { level: string; msg: string; ctx?: unknown }[] = [];
const capturingLogger: LoggerLike = {
  debug: (msg, ctx) => {
    logged.push({ level: "debug", msg, ctx });
  },
  info: (msg, ctx) => {
    logged.push({ level: "info", msg, ctx });
  },
  warn: (msg, ctx) => {
    logged.push({ level: "warn", msg, ctx });
  },
  error: (msg, ctx) => {
    logged.push({ level: "error", msg, ctx });
  },
};

function makeJob(
  overrides: Partial<NotificationDispatchJob> = {},
): NotificationDispatchJob {
  return {
    kind: "notification-dispatch",
    jobId: JobIdValue("bull-1"),
    userId: "user-1",
    notificationKind: "price_alert",
    payload: { symbol: "THYAO", threshold: "120" },
    enqueuedAt: new Date().toISOString(),
    ...overrides,
  };
}

function baseSummary(
  overrides: Partial<DispatchSummary> = {},
): DispatchSummary {
  return {
    userId: "user-1",
    found: 1,
    sent: 1,
    failed: 0,
    durationMs: 12,
    unsupportedKinds: [],
    ...overrides,
  };
}

describe("notification-dispatch handler", () => {
  it("happy path: forwards payload to sendNotification, logs summary, no warn", async () => {
    const sendNotification = vi.fn(async () => baseSummary());
    const services: Pick<NotificationServices, "sendNotification"> = {
      sendNotification: sendNotification as never,
    };

    const handler = makeNotificationDispatchHandler({
      notificationServices: services as unknown as NotificationServices,
      logger: capturingLogger,
    });

    await handler(makeJob());

    expect(sendNotification).toHaveBeenCalledOnce();
    const input = (sendNotification.mock.calls[0] as unknown as [{ userId: string; payload: Record<string, unknown> }])?.[0];
    expect(input).toMatchObject({
      userId: "user-1",
      payload: { symbol: "THYAO", threshold: "120" },
    });

    // Two info logs: "dequeued" + "handled".
    const infoMsgs = logged.filter((l) => l.level === "info").map((l) => l.msg);
    expect(infoMsgs).toContain("notification-dispatch: dequeued");
    expect(infoMsgs).toContain("notification-dispatch: handled");
    // No warn — summary had no unsupportedKinds.
    expect(logged.some((l) => l.level === "warn")).toBe(false);
  });

  it("warns when summary carries unsupported channel kinds", async () => {
    const sendNotification = vi.fn(async () =>
      baseSummary({ found: 2, sent: 1, failed: 0, unsupportedKinds: ["email"] }),
    );
    const services: Pick<NotificationServices, "sendNotification"> = {
      sendNotification: sendNotification as never,
    };

    const handler = makeNotificationDispatchHandler({
      notificationServices: services as unknown as NotificationServices,
      logger: capturingLogger,
    });

    await handler(makeJob());

    const warns = logged.filter((l) => l.level === "warn");
    expect(warns).toHaveLength(1);
    expect(warns[0]?.msg).toContain("unsupported channel kinds");
    expect(warns[0]?.ctx).toMatchObject({ unsupportedKinds: ["email"] });
  });

  it("re-throws when sendNotification fails so BullMQ retries", async () => {
    const boom = new Error("redis is down");
    const sendNotification = vi.fn(async () => {
      throw boom;
    });
    const services: Pick<NotificationServices, "sendNotification"> = {
      sendNotification: sendNotification as never,
    };

    const handler = makeNotificationDispatchHandler({
      notificationServices: services as unknown as NotificationServices,
      logger: capturingLogger,
    });

    await expect(handler(makeJob())).rejects.toBe(boom);
    // Still logged the dequeue so we have an audit trail of the attempt.
    expect(
      logged.some(
        (l) => l.level === "info" && l.msg === "notification-dispatch: dequeued",
      ),
    ).toBe(true);
  });
});