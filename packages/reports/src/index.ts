/**
 * @openbulls/reports — public barrel.
 *
 * Re-exports the full surface so callers depend on one path:
 *
 *   import { createReportsServicesFromDb } from "@openbulls/reports";
 *
 * Domain errors + types stay in the public API so the agent-worker
 * can classify them (e.g. \`isReportsError\` for retry decisions).
 */
export type {
  ReportFormat,
  ReportRow,
  ReportStatus,
  ReportType,
} from "./domain";
export {
  InvalidReportParametersError,
  ReportJobAlreadyFinalizedError,
  ReportRenderError,
  ReportRepositoryError,
  ReportUploadError,
  TemplateMissingError,
  UnknownReportFormatError,
  UnknownReportTypeError,
  defaultTitleFor,
  isReportsError,
  reportFormatSchema,
  reportParametersSchema,
  reportStatusSchema,
  reportTypeSchema,
} from "./domain";
export type { ReportsErrorCode } from "./domain";

export type {
  GetReportResult,
  ListReportsOptions,
  RenderReportInput,
  RenderReportResult,
  ReportsDeps,
  ReportsServices,
} from "./application";
export { contentTypeForFormat, getReport, listReports, renderReport } from "./application";

export type { IReportRepository, NewReportInput } from "./infrastructure/repositories/ports";
export {
  DrizzleReportRepository,
  countByUserAndStatus,
} from "./infrastructure/repositories/drizzle-repositories";
export { createReportsServicesFromDb } from "./infrastructure/composition";
export type {
  CreateReportsServicesInput,
  RendererResolver,
} from "./infrastructure/composition";