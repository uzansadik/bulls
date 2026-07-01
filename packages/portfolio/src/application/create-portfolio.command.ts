/**
 * @openbulls/portfolio — `createPortfolio` use case.
 *
 * Inserts a new portfolio row. `baseCurrency` defaults to TRY
 * when omitted (matches DB column default). The created entity
 * is returned to the caller so they can navigate to it.
 */
import { type Result, err, ok } from "@openbulls/shared";
import { Currency, PortfolioId, UserId } from "../domain/brands";
import { InvalidInputError, PortfolioError } from "../domain/errors";
import type { Portfolio } from "../domain/portfolio";
import type { PortfolioDeps } from "./portfolio-deps";

export interface CreatePortfolioInput {
  readonly userId: string;
  readonly name: string;
  readonly baseCurrency?: string;
}

export async function createPortfolio(
  deps: PortfolioDeps,
  input: CreatePortfolioInput,
): Promise<Result<Portfolio, PortfolioError>> {
  const trimmed = input.name.trim();
  if (!trimmed) {
    return err(new InvalidInputError({ field: "name", reason: "must not be empty" }));
  }
  if (trimmed.length > 100) {
    return err(
      new InvalidInputError({ field: "name", reason: "must be 100 characters or fewer" }),
    );
  }
  const created = await deps.portfolios.create({
    userId: input.userId,
    name: trimmed,
    baseCurrency: input.baseCurrency ?? "TRY",
  });
  deps.logger.info("portfolio.created", {
    portfolioId: created.id,
    userId: created.userId,
  });
  return ok<Portfolio>({
    id: PortfolioId(created.id),
    userId: UserId(created.userId),
    name: created.name,
    baseCurrency: Currency(created.baseCurrency),
    isArchived: created.isArchived,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  });
}