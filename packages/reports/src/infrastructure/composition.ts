/**
 * @openbulls/reports — composition root.
 *
 * Wires \`createReportsServicesFromDb\` for the agent-worker boot.
 * Faz 7.2 leaves the renderer registry empty (no-op renderer) so
 * the orchestration is exercisable end-to-end. Faz 7.3 swaps the
 * no-op registry for the real PDF/Excel/Markdown renderers.
 */
import { db as defaultDb } from "@openbulls/db/client";
import { logger as pinoLogger } from "@openbulls/logger";

import { type ReportsServices, getReport, listReports, renderReport } from "../application";
import type { ReportsDeps } from "../application";
import { DrizzleReportRepository } from "./repositories/drizzle-repositories";
import type { IReportRepository } from "./repositories/ports";

/**
 * Renderer slot. Faz 7.2 ships a no-op so the command is
 * exercisable; Faz 7.3 plugs a real registry. The slot is a
 * closure, not a class — the agent-worker boot calls
 * \`createReportsServicesFromDb\` and never touches renderers
 * directly.
 */
export type RendererResolver = (
  reportType: string,
  format: string,
) => Promise<{
  readonly contentType: string;
  readonly render: () => Promise<Buffer>;
}>;

export interface CreateReportsServicesInput {
  readonly db?: ReportsDeps["db"];
  readonly repo?: IReportRepository;
  readonly storage: ReportsDeps["storage"];
  readonly logger?: ReportsDeps["logger"];
  readonly now?: () => Date;
  /** Faz 7.3 hook; today defaults to a no-op renderer. */
  readonly resolveRenderer?: RendererResolver;
}

const noopResolver: RendererResolver = async (reportType, format) => ({
  contentType:
    format === "pdf"
      ? "application/pdf"
      : format === "excel"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/markdown",
  render: async (): Promise<Buffer> => {
    // No-op renderer: emits a tiny stub document so the
    // orchestration path (insert → render → upload → markReady)
    // can be exercised end-to-end. The stub body is intentionally
    // recognizable so tests can assert on it.
    return Buffer.from(
      `# Openbulls report (stub)\n\ntype: ${reportType}\nformat: ${format}\n`,
    );
  },
});

export function createReportsServicesFromDb(
  input: CreateReportsServicesInput,
): { services: ReportsServices } {
  const db = input.db ?? (defaultDb as never);
  const repo = input.repo ?? new DrizzleReportRepository(db);
  const logger = input.logger ?? pinoLogger;
  const now = input.now ?? (() => new Date());
  const resolveRenderer: RendererResolver =
    input.resolveRenderer ?? noopResolver;

  return {
    services: {
      renderReport: (inp) =>
        renderReport({ repo, storage: input.storage, now, logger, resolveRenderer }, inp),
      listReports: (userId, options) => listReports({ repo }, userId, options),
      getReport: (userId, reportId) =>
        getReport({ repo, storage: input.storage, now }, userId, reportId),
    },
  };
}

/** Exposed for tests that want the no-op renderer as a fallback. */
export { noopResolver };