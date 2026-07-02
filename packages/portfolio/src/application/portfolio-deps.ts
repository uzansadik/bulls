/**
 * @openbulls/portfolio — application dependency surface.
 *
 * Every use case (`*.command.ts` / `*.query.ts`) takes a
 * `PortfolioDeps` as its first parameter. The composition root
 * (`createPortfolioServicesFromDb`) builds a fully-bound instance
 * and the calling code never sees the underlying ports.
 *
 * Convention mirrors `@openbulls/billing` and `@openbulls/market-data`:
 * keep the surface minimal, accept a `LoggerLike` for structured
 * logging, and inject `now: () => Date` so time-sensitive logic
 * (validation windows, timestamps) is testable.
 */
import type { IMarketDataQueryGateway } from "../domain/ports/market-data.port";
import type { LoggerLike } from "../domain/ports/logger.port";
import type { IPortfolioRepository } from "../domain/ports/portfolio-repository.port";

export interface PortfolioDeps {
  readonly portfolios: IPortfolioRepository;
  readonly marketData: IMarketDataQueryGateway;
  readonly logger: LoggerLike;
  readonly now: () => Date;
}