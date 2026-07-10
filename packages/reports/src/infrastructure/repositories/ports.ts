/**
 * @openbulls/reports — repository port.
 *
 * Mirrors the notifications-package pattern (package-local port +
 * drizzle impl). The application layer depends only on this port;
 * the composition root picks the impl at boot.
 */
import type {
  NewReport,
  Report,
} from "@openbulls/db/schema/reports.schema";

export interface NewReportInput {
  readonly userId: string;
  readonly reportType: "portfolio_review" | "company_analysis" | "technical_analysis" | "earnings_summary" | "custom";
  readonly format: "pdf" | "excel" | "markdown";
  readonly title: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly status: "pending" | "generating" | "ready" | "failed";
  readonly portfolioId?: string | null;
}

export interface ListByUserOptions {
  readonly limit?: number;
  readonly status?: "pending" | "generating" | "ready" | "failed";
}

export interface IReportRepository {
  /** Insert a new \`reports\` row in \`pending\` state (or whatever \`input.status\` says). */
  insert(input: NewReportInput): Promise<Report>;

  /** Fetch a single row by id. Returns \`null\` if missing. */
  getById(id: string): Promise<Report | null>;

  /** Paginated list of a user's reports, newest first. */
  listByUser(
    userId: string,
    options?: ListByUserOptions,
  ): Promise<readonly Report[]>;

  /** Mark the row \`generating\` + set \`startedAt\`. Idempotent. */
  markGenerating(id: string): Promise<Report>;

  /**
   * Mark the row \`ready\` + attach the storage key + final size +
   * \`generatedAt\` timestamp. Returns the updated row.
   */
  markReady(id: string, storageKey: string, sizeBytes: number): Promise<Report>;

  /**
   * Mark the row \`failed\` + attach the error reason. Does NOT
   * advance \`next_run_at\` (cron counterpart does that). The row
   * stays at \`status="failed"\` so the UI can show a retry button
   * (Faz 8+).
   */
  markFailed(id: string, reason: string): Promise<Report>;
}