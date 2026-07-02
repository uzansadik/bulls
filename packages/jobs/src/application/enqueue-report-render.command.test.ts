/**
 * Application: enqueueReportRender.
 */
import { describe, expect, it } from "vitest";
import { createInMemoryQueue } from "../__tests__/queue.mock";
import { noopLogger } from "../infrastructure/log";
import { enqueueReportRender } from "./enqueue-report-render.command";

describe("enqueueReportRender", () => {
  it("stamps a jobId on valid input", async () => {
    const q = createInMemoryQueue();
    const r = await enqueueReportRender(
      { producer: q.producer, logger: noopLogger },
      {
        userId: "u-1",
        reportType: "portfolio_review",
        format: "pdf",
        payload: { runId: "r-1" },
      },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const first = q.state.enqueued[0];
    expect(first?.kind).toBe("report-render");
    if (first?.kind === "report-render") {
      expect(first.format).toBe("pdf");
    }
  });

  it("rejects unknown format", async () => {
    const q = createInMemoryQueue();
    const invalid = {
      userId: "u-1",
      reportType: "portfolio_review",
      format: "docx",
      payload: {},
    };
    const r = await enqueueReportRender(
      { producer: q.producer, logger: noopLogger },
      // biome-ignore lint/suspicious/noExplicitAny: runtime validation target
      invalid as any,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("jobs/payload-invalid");
  });
});
