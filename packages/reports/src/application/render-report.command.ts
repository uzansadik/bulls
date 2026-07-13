/**
 * @openbulls/reports — \`renderReport\` orchestration command.
 *
 * Faz 7.2 orchestrates DB lifecycle only. The actual byte-rendering
 * (handlebars/pdfkit/exceljs) lands in Faz 7.3 — this command calls
 * a \`RendererRegistry\` that today returns an empty buffer for any
 * input, but the contract (input + format → Buffer) is stable so
 * adding renderers later is a drop-in.
 *
 * Flow:
 *   1. Insert \`reports\` row (status="pending").
 *   2. Renderer runs (Faz 7.3) → bytes.
 *   3. Upload to storage adapter.
 *   4. Mark row \`ready\` (status="ready", storageKey, generatedAt).
 *   5. Any throw → mark \`failed\` with \`error\` column.
 */
import { isStorageError, StorageKey, type IStorageAdapter } from "@openbulls/storage";

import { defaultTitleFor } from "../domain";
import {
  InvalidReportParametersError,
  ReportRenderError,
  ReportUploadError,
  TemplateMissingError,
  UnknownReportFormatError,
  UnknownReportTypeError,
} from "../domain";
import {
  reportFormatSchema,
  reportParametersSchema,
  reportTypeSchema,
} from "../domain";
import type { IReportRepository } from "../infrastructure/repositories/ports";
import type { RenderReportInput, RenderReportResult } from "./jobs.types";

export interface RenderReportCommandDeps {
  readonly repo: IReportRepository;
  readonly storage: IStorageAdapter;
  readonly now: () => Date;
  readonly logger: import("@openbulls/logger").LoggerLike;
  /**
   * Resolve a renderer. Faz 7.3 plugs in a real registry; today
   * a no-op renderer returning an empty Buffer is wired in the
   * composition root so the orchestration is exercisable.
   */
  readonly resolveRenderer: (
    reportType: string,
    format: string,
  ) => Promise<{ readonly contentType: string; readonly render: () => Promise<Buffer> }>;
}

const TRANSIENT_RETRY_DELAY_MS = 0; // BullMQ retry policy owns backoff

export async function renderReport(
  deps: RenderReportCommandDeps,
  input: RenderReportInput,
): Promise<RenderReportResult> {
  const startedAt = deps.now();

  // 1. Validate format + parameters (type stays loose — enum added in Faz 8).
  const format = reportFormatSchema.safeParse(input.format);
  if (!format.success) {
    throw new UnknownReportFormatError(`unknown report format: ${String(input.format)}`, {
      format: String(input.format),
    });
  }
  const params = reportParametersSchema.safeParse(input.parameters);
  if (!params.success) {
    throw new InvalidReportParametersError(
      `report parameters invalid: ${params.error.issues.map((i) => i.message).join("; ")}`,
      { issues: params.error.issues.map((i) => i.message) },
    );
  }

  // 2. Validate type if it matches the known enum; otherwise accept
  //    as a freeform \`custom\` extension. The DB column is typed via
  //    the enum so unknown strings fail at insert.
  const knownType = reportTypeSchema.safeParse(input.reportType);
  if (!knownType.success) {
    deps.logger.warn("reports: unknown reportType, falling back to \`custom\`", {
      reportType: String(input.reportType),
    });
  }

  const title = input.title ?? defaultTitleFor(
    (knownType.success ? knownType.data : "custom") as never,
    params.data,
  );

  // 3. Insert pending row.
  const inserted = await deps.repo.insert({
    userId: input.userId,
    reportType: knownType.success ? knownType.data : "custom",
    format: format.data,
    title,
    parameters: params.data,
    status: "pending",
    portfolioId: input.portfolioId ?? null,
  });

  // 4. Resolve renderer.
  let renderer: Awaited<ReturnType<typeof deps.resolveRenderer>>;
  try {
    renderer = await deps.resolveRenderer(inserted.reportType, inserted.format);
  } catch (err) {
    await markFailed(deps, inserted.id, `renderer_not_found: ${(err as Error).message}`);
    throw new TemplateMissingError(
      `no renderer for ${inserted.reportType}/${inserted.format}`,
      { reportType: inserted.reportType, format: inserted.format },
    );
  }

  // 5. Render bytes.
  let bytes: Buffer;
  try {
    bytes = await renderer.render();
  } catch (err) {
    await markFailed(deps, inserted.id, `render_failed: ${(err as Error).message}`);
    throw new ReportRenderError(
      `render failed for ${inserted.reportType}/${inserted.format}: ${(err as Error).message}`,
      { reportType: inserted.reportType, format: inserted.format, cause: String(err) },
    );
  }

  // 6. Upload to storage.
  const storageKey = StorageKey(
    `reports/${inserted.userId}/${inserted.id}.${inserted.format === "excel" ? "xlsx" : inserted.format}`,
  );
  try {
    await deps.storage.upload({
      key: storageKey,
      body: new Uint8Array(bytes),
      contentType: contentTypeForFormat(format.data) as
        | "application/pdf"
        | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        | "text/markdown"
        | "application/octet-stream",
      metadata: {
        reportId: inserted.id,
        userId: inserted.userId,
        reportType: inserted.reportType,
      },
    });
  } catch (err) {
    await markFailed(deps, inserted.id, `upload_failed: ${(err as Error).message}`);
    if (isStorageError(err)) {
      throw new ReportUploadError(
        `upload failed for report ${inserted.id}: ${err.message}`,
        {
          reportType: inserted.reportType,
          storageKey: String(storageKey),
          cause: err.message,
        },
      );
    }
    throw err;
  }

  // 7. Mark ready.
  const ready = await deps.repo.markReady(inserted.id, String(storageKey), bytes.byteLength);

  deps.logger.info("reports: render complete", {
    reportId: inserted.id,
    reportType: inserted.reportType,
    format: inserted.format,
    bytes: bytes.byteLength,
    durationMs: deps.now().getTime() - startedAt.getTime(),
  });

  return {
    reportId: ready.id,
    storageKey: String(storageKey),
    contentType: renderer.contentType,
    size: bytes.byteLength,
    durationMs: deps.now().getTime() - startedAt.getTime() + TRANSIENT_RETRY_DELAY_MS,
  };
}

async function markFailed(
  deps: RenderReportCommandDeps,
  reportId: string,
  reason: string,
): Promise<void> {
  try {
    await deps.repo.markFailed(reportId, reason);
  } catch (err) {
    deps.logger.error("reports: failed to mark row failed", {
      reportId,
      err: String(err),
    });
  }
}

export function contentTypeForFormat(format: "pdf" | "excel" | "markdown"): string {
  switch (format) {
    case "pdf":
      return "application/pdf";
    case "excel":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "markdown":
      return "text/markdown";
  }
}

// Re-export so the orchestrator's helper is reachable from tests.
export { UnknownReportTypeError };