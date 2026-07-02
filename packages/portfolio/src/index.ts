/**
 * @openbulls/portfolio — public barrel.
 *
 * Consumers should import from here rather than reaching into
 * internal paths. The barrel is grouped by layer:
 *
 *   - domain: VOs, brands, error taxonomy, port interfaces
 *   - services: pure helpers (cost-basis, fx-adjust, pnl, performance)
 *   - application: commands + queries (use cases)
 *   - infrastructure: composition roots + service surface
 *
 * Re-exports use `type` modifiers where appropriate to keep the
 * consumer's bundle small.
 */

// ── Domain: brands ────────────────────────────────────────────────
export {
  PortfolioId,
  UserId,
  TransactionSide,
  Money,
  Currency,
} from "./domain/brands";

// ── Domain: VOs ───────────────────────────────────────────────────
export type { Portfolio } from "./domain/portfolio";
export type { Transaction } from "./domain/transaction";
export type { Holding } from "./domain/holding";
export type { Position } from "./domain/position";
export type {
  RealizedPnl,
  UnrealizedPnl,
  Cashflow,
  EquityPoint,
  PerformanceSnapshot,
} from "./domain/pnl";
export type { PortfolioSnapshot, PortfolioTotals } from "./domain/snapshot";

// ── Domain: symbol ───────────────────────────────────────────────
export { AssetSymbol } from "./domain/symbol";

// ── Domain: error taxonomy ────────────────────────────────────────
export type { PortfolioError } from "./domain/errors";
export {
  PortfolioNotFoundError,
  TransactionNotFoundError,
  HoldingNotFoundError,
  ArchivedPortfolioError,
  CurrencyMismatchError,
  InvalidTransactionError,
  InvalidInputError,
  DuplicateTransactionError,
  RepositoryError,
  isFatal,
  isUserFacing,
  isRetryable,
} from "./domain/errors";

// ── Domain: ports ─────────────────────────────────────────────────
export type {
  IMarketDataQueryGateway,
  MarketDataQuote,
} from "./domain/ports/market-data.port";
export type { IPortfolioRepository } from "./domain/ports/portfolio-repository.port";
export type { LoggerLike } from "./domain/ports/logger.port";
export { noopLogger } from "./domain/ports/logger.port";

// ── Application: deps ─────────────────────────────────────────────
export type { PortfolioDeps } from "./application/portfolio-deps";

// ── Domain: fx-rate (minimal shape used by services) ──────────────
export type { FxRate } from "./domain/fx-rate";

// ── Domain services (pure helpers) ───────────────────────────────
export { recomputeHolding, type RecomputedHolding } from "./domain/services/cost-basis";
export {
  convert,
  FxRateMap,
  type FxRateMapLike,
} from "./domain/services/fx-adjust";
export {
  calculateUnrealizedPnl,
  calculateRealizedPnl,
} from "./domain/services/pnl";
export {
  calculateTotalReturn,
  calculateTimeWeightedReturn,
  calculateMaxDrawdown,
  type MaxDrawdownResult,
} from "./domain/services/performance";

// ── Application: commands ─────────────────────────────────────────
export type {
  CreatePortfolioInput,
} from "./application/create-portfolio.command";
export { createPortfolio } from "./application/create-portfolio.command";

export type {
  ArchivePortfolioInput,
} from "./application/archive-portfolio.command";
export { archivePortfolio } from "./application/archive-portfolio.command";

export type {
  AddTransactionInput,
  AddTransactionOutput,
} from "./application/add-transaction.command";
export { addTransaction } from "./application/add-transaction.command";

export type {
  DeleteTransactionInput,
  DeleteTransactionOutput,
} from "./application/delete-transaction.command";
export { deleteTransaction } from "./application/delete-transaction.command";

export type {
  RecomputeHoldingInput,
  RecomputeHoldingOutput,
} from "./application/recompute-holding.command";
export { recomputeHoldingCmd } from "./application/recompute-holding.command";

export type {
  ImportSnapshotInput,
  ImportSnapshotOutput,
} from "./application/import-snapshot.command";
export { importSnapshot } from "./application/import-snapshot.command";

// ── Application: queries ──────────────────────────────────────────
export type {
  ListTransactionsInput,
} from "./application/list-transactions.query";
export { listTransactions } from "./application/list-transactions.query";

export type {
  GetHoldingsInput,
  HoldingRow,
} from "./application/get-holdings.query";
export { getHoldings } from "./application/get-holdings.query";

export type {
  GetPortfolioOverviewInput,
} from "./application/get-portfolio-overview.query";
export { getPortfolioOverview } from "./application/get-portfolio-overview.query";

export type {
  GetPortfolioPerformanceInput,
} from "./application/get-portfolio-performance.query";
export { getPortfolioPerformance } from "./application/get-portfolio-performance.query";

// ── Infrastructure: composition root + types ──────────────────────
export type {
  PortfolioServices,
} from "./infrastructure/portfolio.types";
export type {
  CreatePortfolioServicesFromDbInput,
} from "./infrastructure/composition";
export {
  createPortfolioServices,
  createPortfolioServicesFromDb,
} from "./infrastructure/composition";
export { noopLogger as noopPortfolioLogger } from "./infrastructure/log";
