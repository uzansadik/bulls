/**
 * @openbulls/reports — application-layer types.
 *
 * Mirrors the notifications-package pattern (`application/jobs.types.ts`):
 *   - `ReportsDeps` is the input the composition root accepts.
 *   - `ReportsServices` is the surface consumers depend on.
 *
 * Today the renderer registry is part of the deps; in Faz 7.5 the
 * subgraph will pass \`renderReport\` an already-built data block
 * (the subgraph collects; the dispatcher renders — separation of
 * concerns).
 */
import type { DatabaseOrTx } from "@openbulls/db/client";
import type { LoggerLike } from "@openbulls/logger";
import type { IStorageAdapter } from "@openbulls/storage";

import type { IReportRepository } from "../infrastructure/repositories/ports";
import type {
  ReportFormat,
  ReportRow,
  ReportType,
} from "../domain";

export interface ReportsDeps {
  readonly db: DatabaseOrTx;
  readonly repo?: IReportRepository;
  readonly storage: IStorageAdapter;
  readonly logger?: LoggerLike;
  readonly now?: () => Date;
}

export interface RenderReportInput {
  readonly userId: string;
  readonly reportType: ReportType | string;
  readonly format: ReportFormat;
  readonly parameters: Readonly<Record<string, unknown>>;
  /** Optional title; falls back to \`defaultTitleFor(reportType, parameters)\`. */
  readonly title?: string;
  /** Optional explicit portfolio link (foreign key). */
  readonly portfolioId?: string;
}

export interface RenderReportResult {
  readonly reportId: string;
  readonly storageKey: string;
  readonly contentType: string;
  readonly size: number;
  readonly durationMs: number;
}

export interface ListReportsOptions {
  readonly limit?: number;
  readonly status?: "pending" | "generating" | "ready" | "failed";
}

export interface GetReportResult {
  readonly report: ReportRow;
  readonly downloadUrl: string;
  readonly downloadUrlExpiresAt: Date;
}

export interface ReportsServices {
  readonly renderReport: (input: RenderReportInput) => Promise<RenderReportResult>;
  readonly listReports: (
    userId: string,
    options?: ListReportsOptions,
  ) => Promise<readonly ReportRow[]>;
  readonly getReport: (userId: string, reportId: string) => Promise<GetReportResult | null>;
}