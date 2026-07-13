/**
 * @openbulls/reports — infrastructure barrel.
 */
export type {
  IReportRepository,
  ListByUserOptions,
  NewReportInput,
} from "./repositories/ports";
export { DrizzleReportRepository, countByUserAndStatus } from "./repositories/drizzle-repositories";
export {
  createReportsServicesFromDb,
  noopResolver,
  type CreateReportsServicesInput,
  type RendererResolver,
} from "./composition";
export {
  TEMPLATE_BY_REPORT_TYPE,
  createDefaultRendererResolver,
} from "./renderer-registry";
export { renderTemplate, compileTemplate } from "./template-engine";
export { renderMarkdown } from "./markdown/markdown-report.renderer";
export { t, asLocale, resolveMessage } from "./i18n/translate";