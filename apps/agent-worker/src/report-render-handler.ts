/**
 * apps/agent-worker — \`report-render\` job handler.
 *
 * Bridges BullMQ-dequeued \`ReportRenderJob\` jobs to
 * \`@openbulls/reports\`. The handler:
 *   1. Parses the job (userId, reportType, format, payload).
 *   2. Calls \`reports.services.renderReport(...)\`. The orchestrator
 *      handles insert → render → upload → markReady internally.
 *   3. Logs the outcome + storage key for ops tracing.
 *
 * Failure policy:
 *   - Transient (storage upload retry, registry throw): re-throw,
 *     BullMQ retries with its configured backoff.
 *   - Permanent (unknown format, invalid parameters): \`renderReport\`
 *     marks the row failed and re-throws. We log the typed error
 *     code so ops can distinguish.
 *   - Unknown reportType: falls back to \`custom\` in the
 *     orchestrator; we don't add special handling here.
 */
import type { LoggerLike } from "@openbulls/agent-runtime";
import { isReportsError } from "@openbulls/reports";
import type { ReportsServices } from "@openbulls/reports";
import type { ReportRenderJob } from "@openbulls/jobs";

export interface ReportRenderHandlerDeps {
  readonly reports: ReportsServices;
  readonly logger: LoggerLike;
}

/**
 * Factory for the BullMQ handler. Pure — no global state, safe to
 * unit-test with stubbed \`reports.services.renderReport\`.
 */
export function makeReportRenderHandler(
  deps: ReportRenderHandlerDeps,
): (job: ReportRenderJob) => Promise<void> {
  return async (job: ReportRenderJob): Promise<void> => {
    const log = {
      jobId: job.jobId,
      userId: job.userId,
      reportType: job.reportType,
      format: job.format,
    };

    deps.logger.info("report-render: dequeued", log);

    try {
      const out = await deps.reports.renderReport({
        userId: job.userId,
        // reportType is string in the discriminated union; the
        // orchestrator's Zod schema narrows it to the enum (or
        // falls back to "custom" for freeform).
        reportType: job.reportType,
        format: job.format,
        parameters: job.payload,
      });

      deps.logger.info("report-render: rendered", {
        ...log,
        reportId: out.reportId,
        storageKey: out.storageKey,
        size: out.size,
        durationMs: out.durationMs,
      });
    } catch (err) {
      if (isReportsError(err)) {
        deps.logger.error("report-render: failed", {
          ...log,
          code: err.code,
          message: err.message,
        });
      } else {
        deps.logger.error("report-render: failed (non-typed)", {
          ...log,
          err: String(err),
        });
      }
      throw err; // BullMQ retry policy decides next step
    }
  };
}