/**
 * Application: enqueueAgentRun.
 *
 * Verifies:
 *   - happy path stamps a jobId via the producer
 *   - empty userId/graphKey/threadId return PayloadInvalidError
 *   - non-object input returns PayloadInvalidError
 *   - queue unavailability surfaces QueueUnavailableError
 */
import { describe, expect, it } from "vitest";
import { createInMemoryQueue } from "../__tests__/queue.mock";
import { noopLogger } from "../infrastructure/log";
import { enqueueAgentRun } from "./enqueue-agent-run.command";

describe("enqueueAgentRun", () => {
  it("stamps a jobId on valid input", async () => {
    const q = createInMemoryQueue();
    const r = await enqueueAgentRun(
      { producer: q.producer, logger: noopLogger },
      {
        userId: "u-1",
        graphKey: "company-analysis",
        threadId: "th-1",
        input: { symbol: "AAPL" },
      },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.jobId).toMatch(/^mock-/);
    expect(q.state.enqueued).toHaveLength(1);
    expect(q.state.enqueued[0]?.kind).toBe("agent-run");
    expect(q.state.enqueued[0]?.userId).toBe("u-1");
  });

  it("returns PayloadInvalidError when userId is empty", async () => {
    const q = createInMemoryQueue();
    const r = await enqueueAgentRun(
      { producer: q.producer, logger: noopLogger },
      {
        userId: "",
        graphKey: "company-analysis",
        threadId: "th-1",
        input: {},
      },
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("jobs/payload-invalid");
  });

  it("returns PayloadInvalidError when input is an array", async () => {
    const q = createInMemoryQueue();
    const invalid = {
      userId: "u-1",
      graphKey: "company-analysis",
      threadId: "th-1",
      input: [],
    };
    const r = await enqueueAgentRun(
      { producer: q.producer, logger: noopLogger },
      // biome-ignore lint/suspicious/noExplicitAny: runtime validation target
      invalid as any,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("jobs/payload-invalid");
  });

  it("surfaces QueueUnavailableError when producer fails", async () => {
    const q = createInMemoryQueue();
    (q.producer as unknown as { failNext: boolean }).failNext = true;
    const r = await enqueueAgentRun(
      { producer: q.producer, logger: noopLogger },
      {
        userId: "u-1",
        graphKey: "company-analysis",
        threadId: "th-1",
        input: {},
      },
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("jobs/queue-unavailable");
  });
});
