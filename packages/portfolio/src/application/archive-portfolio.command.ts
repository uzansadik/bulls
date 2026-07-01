/**
 * @openbulls/portfolio — `archivePortfolio` use case.
 *
 * Marks a portfolio as archived (soft delete). Archived
 * portfolios are read-only: subsequent calls to
 * `addTransaction` / `recomputeHolding` return
 * `ArchivedPortfolioError`. The operation is idempotent —
 * archiving an already-archived portfolio succeeds.
 */
import { type Result, ok } from "@openbulls/shared";
import { ArchivedPortfolioError, PortfolioError } from "../domain/errors";
import type { PortfolioDeps } from "./portfolio-deps";

export interface ArchivePortfolioInput {
  readonly portfolioId: string;
}

export async function archivePortfolio(
  deps: PortfolioDeps,
  input: ArchivePortfolioInput,
): Promise<Result<{ readonly portfolioId: string; readonly archivedAt: Date }, PortfolioError>> {
  const portfolio = await deps.portfolios.getById(input.portfolioId);
  if (!portfolio) {
    return {
      ok: false,
      error: new ArchivedPortfolioError({
        portfolioId: input.portfolioId as never,
      }),
    } as Result<{ readonly portfolioId: string; readonly archivedAt: Date }, PortfolioError>;
  }
  if (portfolio.isArchived) {
    deps.logger.debug("portfolio.archive.noop", { portfolioId: portfolio.id });
  } else {
    await deps.portfolios.archive(input.portfolioId);
    deps.logger.info("portfolio.archived", { portfolioId: portfolio.id });
  }
  return ok({
    portfolioId: input.portfolioId,
    archivedAt: deps.now(),
  });
}