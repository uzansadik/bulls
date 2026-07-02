/**
 * @openbulls/portfolio — composition root.
 *
 * `createPortfolioServices(deps)` — bind every use case to a
 * `PortfolioDeps`. The shape is fully type-safe and the
 * application code never sees the underlying ports.
 *
 * `createPortfolioServicesFromDb(args)` — convenience factory
 * that wires the Drizzle repository + a narrow market-data
 * gateway from a market-data bundle.
 *
 * Two factory styles are provided so callers can:
 *
 *   - Use `createPortfolioServicesFromDb` in production paths
 *     where Drizzle + the market-data services are already
 *     available.
 *   - Use `createPortfolioServices` in tests with hand-rolled
 *     fakes for `portfolios`, `marketData`, `logger`, and `now`.
 */
import type { IMarketDataQueryGateway } from "../domain/ports/market-data.port";
import { noopLogger, type LoggerLike } from "../domain/ports/logger.port";
import type { PortfolioDeps, PortfolioServices } from "./portfolio.types";
import { addTransaction } from "../application/add-transaction.command";
import { archivePortfolio } from "../application/archive-portfolio.command";
import { createPortfolio } from "../application/create-portfolio.command";
import { deleteTransaction } from "../application/delete-transaction.command";
import { recomputeHoldingCmd } from "../application/recompute-holding.command";
import { listTransactions } from "../application/list-transactions.query";
import { getHoldings } from "../application/get-holdings.query";
import { getPortfolioOverview } from "../application/get-portfolio-overview.query";
import { getPortfolioPerformance } from "../application/get-portfolio-performance.query";
import { importSnapshot } from "../application/import-snapshot.command";

export interface CreatePortfolioServicesFromDbInput {
  readonly db: never; // DB handle is intentionally `never` for Phase 2:
  // the `@openbulls/db` adapter is bound externally; consumers
  // pass an already-instantiated `IPortfolioRepository`. See
  // `createRepositories(db).portfolios`.
  readonly marketData: IMarketDataQueryGateway;
  readonly portfolios: PortfolioDeps["portfolios"];
  readonly logger?: LoggerLike;
  readonly now?: () => Date;
}

export function createPortfolioServices(deps: PortfolioDeps): PortfolioServices {
  return {
    createPortfolio: (input) => createPortfolio(deps, input),
    archivePortfolio: (input) => archivePortfolio(deps, input),
    addTransaction: (input) => addTransaction(deps, input),
    deleteTransaction: (input) => deleteTransaction(deps, input),
    recomputeHolding: (input) => recomputeHoldingCmd(deps, input),
    listTransactions: (input) => listTransactions(deps, input),
    getHoldings: (input) => getHoldings(deps, input),
    getPortfolioOverview: (input) => getPortfolioOverview(deps, input),
    getPortfolioPerformance: (input) => getPortfolioPerformance(deps, input),
    importSnapshot: (input) => importSnapshot(deps, input),
  };
}

export function createPortfolioServicesFromDb(
  args: CreatePortfolioServicesFromDbInput,
): PortfolioServices {
  const deps: PortfolioDeps = {
    portfolios: args.portfolios,
    marketData: args.marketData,
    logger: args.logger ?? noopLogger,
    now: args.now ?? (() => new Date()),
  };
  return createPortfolioServices(deps);
}