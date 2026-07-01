/**
 * @openbulls/jobs — application: `enqueueReportRender`.
 *
 * Skeleton for Faz 7 (`packages/reports`). Format is one of the three
 * `report_format_enum` values; the renderer adapter (PDF / Excel /
 * markdown) is selected downstream.
 */
import { type Result, err, ok } from "@openbulls/shared";

import { type JobError, PayloadInvalidError } from "../domain/errors";
import type { ReportRenderJob } from "../domain/job-type";
import type { IJobProducer } from "../domain/ports/queue.port";
import type { LoggerLike } from "../infrastructure/log";
import { noopLogger } from "../infrastructure/log";

export interface EnqueueReportRenderDeps {
  readonly producer: IJobProducer;
  readonly logger?: LoggerLike;
}

export interface EnqueueReportRenderInput {
  readonly userId: string;
  readonly reportType: string;
  readonly format: "pdf" | "excel" | "markdown";
  readonly payload: Readonly<Record<string, unknown>>;
}

const ALLOWED_FORMATS = new Set(["pdf", "excel", "markdown"] as const);

export async function enqueueReportRender(
  deps: EnqueueReportRenderDeps,
  input: EnqueueReportRenderInput,
): Promise<Result<{ readonly jobId: string }, JobError>> {
  const logger = deps.logger ?? noopLogger;

  if (!input.userId) {
    return err(
      new PayloadInvalidError("userId is required", {
        jobKind: "report-render",
        field: "userId",
        issue: "empty",
      }),
    );
  }
  if (!input.reportType) {
    return err(
      new PayloadInvalidError("reportType is required", {
        jobKind: "report-render",
        field: "reportType",
        issue: "empty",
      }),
    );
  }
  if (!ALLOWED_FORMATS.has(input.format)) {
    return err(
      new PayloadInvalidError(`format must be one of pdf|excel|markdown`, {
        jobKind: "report-render",
        field: "format",
        issue: `got=${input.format}`,
      }),
    );
  }

  const envelope: Omit<ReportRenderJob, "jobId" | "enqueuedAt"> = {
    kind: "report-render",
    userId: input.userId,
    reportType: input.reportType,
    format: input.format,
    payload: input.payload,
  };

  logger.debug("enqueueReportRender", {
    userId: input.userId,
    reportType: input.reportType,
    format: input.format,
  });

  const result = await deps.producer.enqueue(envelope);
  if (!result.ok) return result;
  return ok({ jobId: result.value.jobId });
}
