/**
 * Application: enqueueScheduledJobDispatch.
 */
import { describe, expect, it } from "vitest";
import { createInMemoryQueue } from "../__tests__/queue.mock";
import { noopLogger } from "../infrastructure/log";
import { enqueueScheduledJobDispatch } from "./enqueue-scheduled-job-dispatch.command";

describe("enqueueScheduledJobDispatch", () => {
  it("stamps a jobId on valid input", async () => {
    const q = createInMemoryQueue();
    const r = await enqueueScheduledJobDispatch(
      { producer: q.producer, logger: noopLogger },
      {
        executionId: "exec-1",
        userId: "u-1",
        jobDefinitionKey: "portfolio_daily_review",
        payload: { foo: "bar" },
      },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.jobId).toMatch(/^mock-/);
    expect(q.state.enqueued[0]?.kind).toBe("scheduled-job-dispatch");
  });

  it("rejects missing executionId", async () => {
    const q = createInMemoryQueue();
    const invalid = {
      executionId: "",
      userId: "u-1",
      jobDefinitionKey: "k",
      payload: {},
    };
    const r = await enqueueScheduledJobDispatch(
      { producer: q.producer, logger: noopLogger },
      // biome-ignore lint/suspicious/noExplicitAny: runtime validation target
      invalid as any,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("jobs/payload-invalid");
  });
});
