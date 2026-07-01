/**
 * @openbulls/portfolio — service surface.
 *
 * `PortfolioServices` is the public bundle of every use case the
 * package exposes. It is built by `createPortfolioServices` (from
 * an explicit `PortfolioDeps`) or by `createPortfolioServicesFromDb`
 * (from a Drizzle DB handle + a market-data bundle). Consumers
 * (AI tools, server actions, tests) receive a single object
 * rather than wiring each function by hand.
 */
import type { PortfolioDeps } from "../application/portfolio-deps";
import type { AddTransactionInput, AddTransactionOutput } from "../application/add-transaction.command";
import type { ArchivePortfolioInput } from "../application/archive-portfolio.command";
import type { CreatePortfolioInput } from "../application/create-portfolio.command";
import type { DeleteTransactionInput, DeleteTransactionOutput } from "../application/delete-transaction.command";
import type { GetHoldingsInput, HoldingRow } from "../application/get-holdings.query";
import type { GetPortfolioOverviewInput } from "../application/get-portfolio-overview.query";
import type { GetPortfolioPerformanceInput } from "../application/get-portfolio-performance.query";
import type { ImportSnapshotInput, ImportSnapshotOutput } from "../application/import-snapshot.command";
import type { ListTransactionsInput } from "../application/list-transactions.query";
import type {
  RecomputeHoldingInput,
  RecomputeHoldingOutput,
} from "../application/recompute-holding.command";
import type { Portfolio } from "../domain/portfolio";
import type { PortfolioSnapshot } from "../domain/snapshot";
import type { PerformanceSnapshot } from "../domain/pnl";
import type { Transaction } from "../domain/transaction";
import type { PortfolioError } from "../domain/errors";
import type { Result } from "@openbulls/shared";

export type { PortfolioDeps } from "../application/portfolio-deps";

export interface PortfolioServices {
  readonly createPortfolio: (
    input: CreatePortfolioInput,
  ) => Promise<Result<Portfolio, PortfolioError>>;
  readonly archivePortfolio: (
    input: ArchivePortfolioInput,
  ) => Promise<Result<{ readonly portfolioId: string; readonly archivedAt: Date }, PortfolioError>>;
  readonly addTransaction: (
    input: AddTransactionInput,
  ) => Promise<Result<AddTransactionOutput, PortfolioError>>;
  readonly deleteTransaction: (
    input: DeleteTransactionInput,
  ) => Promise<Result<DeleteTransactionOutput, PortfolioError>>;
  readonly recomputeHolding: (
    input: RecomputeHoldingInput,
  ) => Promise<Result<RecomputeHoldingOutput, PortfolioError>>;
  readonly listTransactions: (
    input: ListTransactionsInput,
  ) => Promise<Result<readonly Transaction[], PortfolioError>>;
  readonly getHoldings: (
    input: GetHoldingsInput,
  ) => Promise<Result<readonly HoldingRow[], PortfolioError>>;
  readonly getPortfolioOverview: (
    input: GetPortfolioOverviewInput,
  ) => Promise<Result<PortfolioSnapshot, PortfolioError>>;
  readonly getPortfolioPerformance: (
    input: GetPortfolioPerformanceInput,
  ) => Promise<Result<PerformanceSnapshot, PortfolioError>>;
  readonly importSnapshot: (
    input: ImportSnapshotInput,
  ) => Promise<Result<ImportSnapshotOutput, PortfolioError>>;
}