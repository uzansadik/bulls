/**
 * Re-exports for tests that want shorter import paths.
 * The vitest config maps `@__tests__` to `src/__tests__/`.
 */
export { AssetSymbol } from "../domain/symbol";
export {
  PortfolioId,
  UserId,
  TransactionSide,
  Money,
  Currency,
} from "../domain/brands";
export type { Transaction } from "../domain/transaction";
export type { Portfolio } from "../domain/portfolio";
export type { Holding } from "../domain/holding";
export type { Position } from "../domain/position";
export { noopLogger } from "../domain/ports/logger.port";
export type { LoggerLike } from "../domain/ports/logger.port";
export {
  recomputeHolding,
  calculateUnrealizedPnl,
  calculateRealizedPnl,
  calculateTotalReturn,
  calculateTimeWeightedReturn,
  calculateMaxDrawdown,
} from "../domain/services";
export type { MarketDataQuote } from "../domain/ports/market-data.port";
export type { IMarketDataQueryGateway } from "../domain/ports/market-data.port";
export type { FxRate } from "../domain/fx-rate";