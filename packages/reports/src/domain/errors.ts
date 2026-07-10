/**
 * @openbulls/reports — typed errors.
 *
 * Carries a machine-readable \`code\` + typed \`data\` payload so the
 * agent-worker's \`report-render\` handler can classify:
 *   - transient (retry)        → upload failures, network blips
 *   - permanent (mark failed)  → unknown reportType, invalid params
 *
 * Every thrown error in this package should extend \`ReportsError\`.
 */
import { isStorageError } from "@openbulls/storage";

export type ReportsErrorCode =
  | "reports/invalid-parameters"
  | "reports/unknown-type"
  | "reports/unknown-format"
  | "reports/template-missing"
  | "reports/render-failed"
  | "reports/upload-failed"
  | "reports/repository-failed"
  | "reports/job-already-finalized";

abstract class ReportsError extends Error {
  abstract readonly code: ReportsErrorCode;
}

export class InvalidReportParametersError extends ReportsError {
  readonly code = "reports/invalid-parameters" as const;
  constructor(
    message: string,
    readonly data: { readonly issues: readonly string[] },
  ) {
    super(message);
  }
}

export class UnknownReportTypeError extends ReportsError {
  readonly code = "reports/unknown-type" as const;
  constructor(
    message: string,
    readonly data: { readonly reportType: string },
  ) {
    super(message);
  }
}

export class UnknownReportFormatError extends ReportsError {
  readonly code = "reports/unknown-format" as const;
  constructor(
    message: string,
    readonly data: { readonly format: string },
  ) {
    super(message);
  }
}

export class TemplateMissingError extends ReportsError {
  readonly code = "reports/template-missing" as const;
  constructor(
    message: string,
    readonly data: {
      readonly reportType: string;
      readonly format: string;
    },
  ) {
    super(message);
  }
}

export class ReportRenderError extends ReportsError {
  readonly code = "reports/render-failed" as const;
  constructor(
    message: string,
    readonly data: {
      readonly reportType: string;
      readonly format: string;
      readonly cause?: string;
    },
  ) {
    super(message);
  }
}

export class ReportUploadError extends ReportsError {
  readonly code = "reports/upload-failed" as const;
  constructor(
    message: string,
    readonly data: {
      readonly reportType: string;
      readonly storageKey?: string;
      readonly cause?: string;
    },
  ) {
    super(message);
  }
}

export class ReportRepositoryError extends ReportsError {
  readonly code = "reports/repository-failed" as const;
  constructor(
    message: string,
    readonly data: {
      readonly operation: string;
      readonly cause?: string;
    },
  ) {
    super(message);
  }
}

export class ReportJobAlreadyFinalizedError extends ReportsError {
  readonly code = "reports/job-already-finalized" as const;
  constructor(
    message: string,
    readonly data: { readonly reportId: string },
  ) {
    super(message);
  }
}

/** Returns \`true\` for any reports-package OR storage-package error. */
export const isReportsError = (e: unknown): e is ReportsError =>
  e instanceof Error &&
  "code" in e &&
  typeof (e as { code: unknown }).code === "string" &&
  ((e as { code: string }).code.startsWith("reports/") ||
    isStorageError(e));