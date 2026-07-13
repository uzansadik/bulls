/**
 * @openbulls/reports — \`getReport\` query.
 *
 * Returns a single report + a short-lived download URL. URL is
 * issued by the storage adapter (S3 presigned URL with the
 * configured TTL; local-fs returns a \`file://\` path).
 *
 * Returns \`null\` when the report is missing OR owned by another
 * user — both cases are indistinguishable to the caller (auth
 * gate at the route layer handles 401/403 vs 404).
 */
import { isStorageError } from "@openbulls/storage";

import type { GetReportResult } from "./jobs.types";
import type { IStorageAdapter } from "@openbulls/storage";
import type { IReportRepository } from "../infrastructure/repositories/ports";

export interface GetReportDeps {
  readonly repo: IReportRepository;
  readonly storage: IStorageAdapter;
  readonly now: () => Date;
}

export async function getReport(
  deps: GetReportDeps,
  userId: string,
  reportId: string,
): Promise<GetReportResult | null> {
  const row = await deps.repo.getById(reportId);
  if (!row || row.userId !== userId) {
    return null;
  }
  if (!row.storageKey || row.status !== "ready") {
    // Not yet uploaded — return the row but no URL.
    return {
      report: row,
      downloadUrl: "",
      downloadUrlExpiresAt: new Date(0),
    };
  }
  try {
    const signed = await deps.storage.presign(
      row.storageKey as Parameters<typeof deps.storage.presign>[0],
    );
    return {
      report: row,
      downloadUrl: signed.url,
      downloadUrlExpiresAt: signed.expiresAt,
    };
  } catch (err) {
    if (isStorageError(err)) {
      return {
        report: row,
        downloadUrl: "",
        downloadUrlExpiresAt: new Date(0),
      };
    }
    throw err;
  }
}