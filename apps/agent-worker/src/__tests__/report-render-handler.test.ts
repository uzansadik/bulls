/**
 * apps/agent-worker — \`report-render\` handler smoke tests.
 *
 * Mocks \`ReportsServices.renderReport\` (no Postgres, no storage,
 * no renderers). Coverage:
 *   - happy path: forwards the job to renderReport, logs \`dequeued\`
 *     + \`rendered\` with the result.
 *   - reports error (e.g. TemplateMissingError): logs \`code\` +
 *     \`data\`, re-throws so BullMQ retries.
 *   - non-typed error: logs \`err\` string, re-throws.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LoggerLike } from "@openbulls/agent-runtime";
import {
  TemplateMissingError,
  type ReportsServices,
  type RenderReportResult,
} from "@openbulls/reports";
import { JobIdValue, type ReportRenderJob } from "@openbulls/jobs";

import { makeReportRenderHandler } from "../report-render-handler";

const logged: { level: string; msg: string; ctx?: unknown }[] = [];
const capturingLogger: LoggerLike = {
  debug: (msg, ctx) => logged.push({ level: "debug", msg, ctx }),
  info: (msg, ctx) => logged.push({ level: "info", msg, ctx }),
  warn: (msg, ctx) => logged.push({ level: "warn", msg, ctx }),
  error: (msg, ctx) => logged.push({ level: "error", msg, ctx }),
};

beforeEach(() => {
  logged.length = 0;
});

function makeJob(
  overrides: Partial<ReportRenderJob> = {},
): ReportRenderJob {
  return {
    kind: "report-render",
    jobId: JobIdValue("bull-r-1"),
    userId: "user-1",
    reportType: "portfolio_review",
    format: "pdf",
    payload: { portfolioId: "p-1" },
    enqueuedAt: new Date().toISOString(),
    ...overrides,
  };
}

const baseResult: RenderReportResult = {
  reportId: "rep-1",
  storageKey: "reports/u-1/rep-1.pdf",
  contentType: "application/pdf",
  size: 12,
  durationMs: 7,
};

function makeServices(
  renderReport: ReportsServices["renderReport"],
): Pick<ReportsServices, "renderReport"> {
  return { renderReport: renderReport as never };
}

describe("report-render handler", () => {
  it("happy path: forwards payload to renderReport and logs dequeued + rendered", async () => {
    const renderReport = vi.fn(async () => baseResult);
    const services = makeServices(renderReport);

    const handler = makeReportRenderHandler({
      reports: services as unknown as ReportsServices,
      logger: capturingLogger,
    });

    await handler(makeJob());

    expect(renderReport).toHaveBeenCalledOnce();
    const calls = renderReport.mock.calls as unknown as Array<
      [{ userId: string; reportType: string; format: string; parameters: Record<string, unknown> }]
    >;
    const input = calls[0]?.[0];
    expect(input).toMatchObject({
      userId: "user-1",
      reportType: "portfolio_review",
      format: "pdf",
      parameters: { portfolioId: "p-1" },
    });

    const infoMsgs = logged.filter((l) => l.level === "info").map((l) => l.msg);
    expect(infoMsgs).toContain("report-render: dequeued");
    expect(infoMsgs).toContain("report-render: rendered");
    expect(logged.some((l) => l.level === "error")).toBe(false);
  });

  it("logs typed error code + data and re-throws", async () => {
    const boom = new TemplateMissingError(
      "no renderer for portfolio_review/pdf",
      { reportType: "portfolio_review", format: "pdf" },
    );
    const renderReport = vi.fn(async () => {
      throw boom;
    });
    const services = makeServices(renderReport);

    const handler = makeReportRenderHandler({
      reports: services as unknown as ReportsServices,
      logger: capturingLogger,
    });

    await expect(handler(makeJob())).rejects.toBe(boom);

    const errors = logged.filter((l) => l.level === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0]?.ctx).toMatchObject({
      code: "reports/template-missing",
    });
  });

  it("logs non-typed errors and re-throws", async () => {
    const boom = new Error("redis is down");
    const renderReport = vi.fn(async () => {
      throw boom;
    });
    const services = makeServices(renderReport);

    const handler = makeReportRenderHandler({
      reports: services as unknown as ReportsServices,
      logger: capturingLogger,
    });

    await expect(handler(makeJob())).rejects.toBe(boom);
    const errors = logged.filter((l) => l.level === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0]?.ctx).toMatchObject({ err: expect.stringContaining("redis") });
  });
});