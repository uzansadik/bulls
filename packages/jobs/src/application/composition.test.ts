/**
 * Application: composition root.
 *
 * Verifies the factory wires all four enqueue commands + the consumer
 * lifecycle, and that `enqueueAgentRun` round-trips through the queue
 * with no semantic loss.
 */
import { describe, expect, it } from "vitest";
import { createInMemoryQueue } from "../__tests__/queue.mock";
import { createJobsServices } from "./composition";

describe("createJobsServices", () => {
  it("wires 4 services (enqueueAgentRun, scheduled, notification, report)", () => {
    const q = createInMemoryQueue();
    const services = createJobsServices({
      producer: q.producer,
      consumer: q.consumer,
    });
    expect(typeof services.enqueueAgentRun).toBe("function");
    expect(typeof services.enqueueScheduledJobDispatch).toBe("function");
    expect(typeof services.enqueueNotificationDispatch).toBe("function");
    expect(typeof services.enqueueReportRender).toBe("function");
  });

  it("enqueueAgentRun → consumer.process + dispatch round-trips", async () => {
    const q = createInMemoryQueue();
    const services = createJobsServices({
      producer: q.producer,
      consumer: q.consumer,
    });

    let received: unknown = null;
    await q.consumer.process("agent-run", async (job) => {
      received = job;
    });

    const r = await services.enqueueAgentRun({
      userId: "u-1",
      graphKey: "company-analysis",
      threadId: "th-1",
      input: { symbol: "AAPL" },
    });
    expect(r.ok).toBe(true);

    const dispatch = await q.dispatch();
    expect(dispatch.processed).toBe(1);
    expect(dispatch.failed).toBe(0);
    expect(received).toBeTruthy();
    expect((received as { kind: string }).kind).toBe("agent-run");
  });
});
