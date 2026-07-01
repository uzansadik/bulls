/**
 * Application: enqueueNotificationDispatch.
 *
 * Skeleton for Faz 6 — verify validation contract + envelope shape.
 */
import { describe, expect, it } from "vitest";
import { createInMemoryQueue } from "../__tests__/queue.mock";
import { noopLogger } from "../infrastructure/log";
import { enqueueNotificationDispatch } from "./enqueue-notification-dispatch.command";

describe("enqueueNotificationDispatch", () => {
  it("stamps a jobId on valid input", async () => {
    const q = createInMemoryQueue();
    const r = await enqueueNotificationDispatch(
      { producer: q.producer, logger: noopLogger },
      {
        userId: "u-1",
        notificationKind: "agent_completed",
        payload: { runId: "r-1" },
      },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(q.state.enqueued[0]?.kind).toBe("notification-dispatch");
  });

  it("rejects missing notificationKind", async () => {
    const q = createInMemoryQueue();
    const invalid = {
      userId: "u-1",
      notificationKind: "",
      payload: {},
    };
    const r = await enqueueNotificationDispatch(
      { producer: q.producer, logger: noopLogger },
      // biome-ignore lint/suspicious/noExplicitAny: runtime validation target
      invalid as any,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("jobs/payload-invalid");
  });
});
