/**
 * @openbulls/reports — domain value objects + Zod schemas.
 *
 * Mirrors `@openbulls/db/schema/reports.schema` — the row shape is
 * re-exported as a domain type so application code imports the
 * semantic name (`Report`) rather than the raw Drizzle name.
 *
 * `ReportFormat` and `ReportStatus` are derived from the DB pgEnum
 * tuples so a future enum value lands in both layers automatically
 * (the runtime guard in `renderReportCommand` also rejects anything
 * not in this union).
 */
import { z } from "zod";

import {
  reportFormatEnum,
  reportStatusEnum,
  reportTypeEnum,
} from "@openbulls/db/schema/enums";

import type {
  NewReport,
  Report,
} from "@openbulls/db/schema/reports.schema";

/** Allowed report types. Mirrors `reportTypeEnum`. */
export type ReportType = (typeof reportTypeEnum.enumValues)[number];

/** Allowed report formats. Mirrors `reportFormatEnum`. */
export type ReportFormat = (typeof reportFormatEnum.enumValues)[number];

/** Allowed report statuses. Mirrors `reportStatusEnum`. */
export type ReportStatus = (typeof reportStatusEnum.enumValues)[number];

/** Domain view of a `reports` row. */
export type ReportRow = Report;
export type NewReportRow = NewReport;

/** Zod schemas — runtime guards at the application boundary. */
export const reportTypeSchema = z.enum(reportTypeEnum.enumValues);
export const reportFormatSchema = z.enum(reportFormatEnum.enumValues);
export const reportStatusSchema = z.enum(reportStatusEnum.enumValues);

/**
 * Parameters the dispatcher submits alongside a render request.
 * Anything renderer-specific (e.g. \`portfolioId\`, \`symbol\`) lives in
 * \`parameters\` as a JSON-serializable record. Schema validation
 * is left to the renderer — there are 4 distinct reportTypes today,
 * each with its own parameter shape.
 */
export const reportParametersSchema = z
  .record(z.string(), z.unknown())
  .default({});

/**
 * Convenience: title defaults from the first non-empty parameters
 * entry, or the reportType string when none is provided. Used by
 * the dispatcher's \`renderReport\` command when the caller didn't
 * supply an explicit title.
 */
export function defaultTitleFor(
  reportType: ReportType,
  parameters: Readonly<Record<string, unknown>>,
): string {
  if (typeof parameters.title === "string" && parameters.title.length > 0) {
    return parameters.title;
  }
  if (typeof parameters.symbol === "string" && parameters.symbol.length > 0) {
    return `${reportType} — ${parameters.symbol}`;
  }
  return reportType;
}