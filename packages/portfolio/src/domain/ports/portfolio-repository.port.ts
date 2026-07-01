/**
 * @openbulls/portfolio — portfolio repository port.
 *
 * Re-exports the `IPortfolioRepository` interface from
 * `@openbulls/db` so application code in this package depends on
 * a port (named location) rather than reaching into the DB
 * package directly. The Drizzle adapter that implements the
 * port lives in `@openbulls/db/src/repositories/portfolio.repository.ts`
 * and is bound at the composition root.
 */
export type {
  IPortfolioRepository,
  CreatePortfolioInput,
  AddTransactionInput,
} from "@openbulls/db";
export type {
  Portfolio,
  PortfolioTransaction,
  PortfolioHolding,
} from "@openbulls/db";