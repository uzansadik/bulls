/**
 * @openbulls/reports — \`listReports\` query.
 *
 * Paginates user reports (default 25, max 100). Filters by
 * \`status\` when supplied. Returned rows include the storageKey
 * for already-ready reports so the caller can chain into
 * \`presignDownloadUrl\` (Faz 8+).
 */
import type { ReportRow } from "../domain";
import type { IReportRepository } from "../infrastructure/repositories/ports";
import type { ListReportsOptions } from "./jobs.types";

export interface ListReportsDeps {
  readonly repo: IReportRepository;
}

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export async function listReports(
  deps: ListReportsDeps,
  userId: string,
  options: ListReportsOptions = {},
): Promise<readonly ReportRow[]> {
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  return deps.repo.listByUser(userId, {
    ...(options.status !== undefined ? { status: options.status } : {}),
    limit,
  });
}