/**
 * @openbulls/portfolio — `importSnapshot` skeleton.
 *
 * Phase 2 delivers a *header-detection-only* CSV importer. The
 * full row parser (column-mapping, transaction validation,
 * atomic batch insert) is planned for Phase 7 (reports package).
 *
 * For now, this command:
 *
 *   1. Verifies the portfolio exists and is not archived.
 *   2. Reads the first non-empty line as the header row.
 *   3. Counts the remaining non-empty rows.
 *   4. Returns a summary describing what *would* be imported.
 *
 * Required headers (order-insensitive):
 *
 *   `executedAt, side, symbol, quantity, unitPrice, currency, fees?, notes?`
 *
 * If a header is missing, the result has `valid: false` and the
 * caller should ask the user to fix the file before retrying.
 *
 * Errors:
 *   - `PortfolioNotFoundError` — unknown portfolioId
 *   - `ArchivedPortfolioError`  — portfolio read-only
 *   - `InvalidInputError`       — empty CSV / missing required headers
 */
import { type Result, err, ok } from "@openbulls/shared";
import { PortfolioId } from "../domain/brands";
import {
  ArchivedPortfolioError,
  InvalidInputError,
  type PortfolioError,
  PortfolioNotFoundError as PNF,
} from "../domain/errors";
import type { PortfolioDeps } from "./portfolio-deps";

const REQUIRED_HEADERS = [
  "executedAt",
  "side",
  "symbol",
  "quantity",
  "unitPrice",
  "currency",
] as const;

export interface ImportSnapshotInput {
  readonly portfolioId: string;
  readonly csv: string;
}

export interface ImportSnapshotOutput {
  readonly portfolioId: string;
  readonly detectedColumns: readonly string[];
  readonly missingColumns: readonly string[];
  readonly rowCount: number;
  readonly valid: boolean;
  readonly receivedAt: Date;
}

export async function importSnapshot(
  deps: PortfolioDeps,
  input: ImportSnapshotInput,
): Promise<Result<ImportSnapshotOutput, PortfolioError>> {
  const portfolio = await deps.portfolios.getById(input.portfolioId);
  if (!portfolio) {
    return err(new PNF({ portfolioId: PortfolioId(input.portfolioId) }));
  }
  if (portfolio.isArchived) {
    return err(new ArchivedPortfolioError({ portfolioId: PortfolioId(portfolio.id) }));
  }

  const csv = input.csv.trim();
  if (!csv) {
    return err(new InvalidInputError({ field: "csv", reason: "must not be empty" }));
  }

  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 1) {
    return err(new InvalidInputError({ field: "csv", reason: "must include a header row" }));
  }
  const headerLine = lines[0] ?? "";
  const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());
  const rowCount = lines.length - 1;
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  const valid = missing.length === 0;

  deps.logger.info("portfolio.snapshot.imported.detect", {
    portfolioId: input.portfolioId,
    valid,
    rowCount,
    missing,
  });

  return ok<ImportSnapshotOutput>({
    portfolioId: input.portfolioId,
    detectedColumns: headers,
    missingColumns: missing,
    rowCount,
    valid,
    receivedAt: deps.now(),
  });
}