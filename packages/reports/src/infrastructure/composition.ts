/**
 * @openbulls/reports — composition root.
 *
 * Wires \`createReportsServicesFromDb\` for the agent-worker boot.
 * Faz 7.3 swaps the no-op registry for the markdown renderer;
 * PDF + Excel slots throw \`TemplateMissingError\` so callers
 * see a clear "not yet implemented" rather than empty bytes.
 */
import { db as defaultDb } from "@openbulls/db/client";
import { logger as pinoLogger } from "@openbulls/logger";

import { type ReportsServices, getReport, listReports, renderReport } from "../application";
import type { ReportsDeps } from "../application";
import { DrizzleReportRepository } from "./repositories/drizzle-repositories";
import type { IReportRepository } from "./repositories/ports";
import { createDefaultRendererResolver } from "./renderer-registry";

/**
 * Renderer slot. The composition root passes a real
 * \`createDefaultRendererResolver()\` by default; tests can swap
 * it out (see \`render-report.command.test.ts\`).
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
  /** Override the default renderer resolver. */
  readonly resolveRenderer?: RendererResolver;
}

/**
 * Tiny no-op resolver kept exported for tests that want a stub
 * (e.g. the \`render-report.command\` orchestration tests assert
 * markReady even when the renderer is a no-op). Production
 * callers always use \`createDefaultRendererResolver\` via the
 * composition root.
 */
export const noopResolver: RendererResolver = async (reportType, format) => ({
  contentType:
    format === "pdf"
      ? "application/pdf"
      : format === "excel"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/markdown",
  render: async (): Promise<Buffer> => {
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
    input.resolveRenderer ?? createDefaultRendererResolver();

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