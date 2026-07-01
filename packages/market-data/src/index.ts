/**
 * @openbulls/market-data — public barrel.
 *
 * Application layers (apps/web, apps/agent-worker, packages/portfolio,
 * packages/ai, ...) import from `@openbulls/market-data` only. The
 * concrete adapters (Yahoo / TCMB / KAP / SEC / Twelve Data) and the
 * HTTP client implementation are NOT exported; consumers depend on the
 * ports and obtain bound services from the composition root.
 *
 *   - `MockMarketDataAdapter` is exported because tests and local
 *     development want to instantiate it directly.
 *   - In-memory caches are NOT exported; production code should go
 *     through the composition root (which may swap in Drizzle-backed
 *     caches).
 */

// ── Domain: value objects ──────────────────────────────────────────
export type { Candle } from "./domain/candle";
export type { Price } from "./domain/price";
export type { Quote, MarketState } from "./domain/quote";
export type { FinancialStatement } from "./domain/financial-statement";
export type { FinancialRatio } from "./domain/financial-ratio";
export type { FxRate } from "./domain/fx-rate";
export type { NewsItem } from "./domain/news";
export type { Indicator, IndicatorPoint } from "./domain/indicator";

// ── Domain: brands ─────────────────────────────────────────────────
export {
  AssetSymbol,
  Currency,
  IndicatorType,
  Interval,
  ProviderName,
  StatementType,
} from "./domain/brands";
export type {
  AssetSymbol as AssetSymbolT,
  Currency as CurrencyT,
  IndicatorType as IndicatorTypeT,
  Interval as IntervalT,
  ProviderName as ProviderNameT,
  StatementType as StatementTypeT,
} from "./domain/brands";

// ── Domain: errors ─────────────────────────────────────────────────
export {
  CacheError,
  InvalidRequestError,
  MarketDataError,
  NetworkError,
  ParseError,
  ProviderUnavailableError,
  RateLimitedError,
  SymbolNotFoundError,
  TimeoutError,
  UnsupportedCapabilityError,
  isFatal,
  isRateLimited,
} from "./domain/errors";

// ── Domain: indicators (pure calculations) ─────────────────────────
export { calculateRSI } from "./domain/indicators/rsi";
export { calculateSMA } from "./domain/indicators/sma";
export { calculateEMA } from "./domain/indicators/ema";
export { calculateMACD } from "./domain/indicators/macd";
export { calculateBollingerBands } from "./domain/indicators/bollinger";

// ── Adapter port (uniform `MarketDataAdapter` interface) ───────────
export type {
  AdapterCapability,
  GetCandlesInput,
  GetFinancialRatiosInput,
  GetFinancialStatementsInput,
  GetFxRateInput,
  GetNewsInput,
  GetQuoteInput,
  MarketDataAdapter,
} from "./infrastructure/adapter/market-data-adapter.port";

// ── Mock adapter (exported for tests + local dev) ──────────────────
export { MockMarketDataAdapter } from "./infrastructure/adapter/mock-market-data.adapter";

// ── Application queries ────────────────────────────────────────────
export { getCandles } from "./application/get-candles.query";
export type { GetCandlesDeps } from "./application/get-candles.query";
export { getQuote } from "./application/get-quote.query";
export type { GetQuoteDeps, GetQuoteQueryInput } from "./application/get-quote.query";
export { getFinancialStatements } from "./application/get-financial-statements.query";
export type { GetFinancialStatementsDeps } from "./application/get-financial-statements.query";
export { getFinancialRatios } from "./application/get-financial-ratios.query";
export type { GetFinancialRatiosDeps } from "./application/get-financial-ratios.query";
export { getFxRate } from "./application/get-fx-rate.query";
export type { GetFxRateDeps, GetFxRateQueryInput } from "./application/get-fx-rate.query";
export { getNews } from "./application/get-news.query";
export type { GetNewsDeps } from "./application/get-news.query";
export { calculateRsi } from "./application/calculate-rsi.query";
export type { CalculateRsiDeps, CalculateRsiInput } from "./application/calculate-rsi.query";
export { calculateMacd } from "./application/calculate-macd.query";
export type { CalculateMacdDeps, CalculateMacdInput } from "./application/calculate-macd.query";
export { calculateSma } from "./application/calculate-sma.query";
export type { CalculateSmaDeps, CalculateSmaInput } from "./application/calculate-sma.query";

// ── Composition root ───────────────────────────────────────────────
export type {
  MarketDataDeps,
  MarketDataServices,
} from "./infrastructure/market-data.types";
export type { MarketDataEnv } from "./infrastructure/composition";
export { createMarketDataServicesFromEnv } from "./infrastructure/composition";

// ── Router (advanced callers / tests) ──────────────────────────────
export type {
  IProviderRouter,
  ProviderRoute,
  RouterPolicy,
} from "./domain/ports/router.port";
export { DefaultProviderRouter } from "./infrastructure/router/provider-router";
export { defaultPolicy } from "./infrastructure/router/policy";

// ── Cache ports (for tests + custom cache adapters) ────────────────
export type {
  CandleCacheReadInput,
  CandleCacheWriteInput,
  FinancialCacheReadInput,
  FxRateCacheReadInput,
  FxRateCacheWriteInput,
  ICandleCache,
  IFinancialRatioCache,
  IFinancialStatementCache,
  IFxRateCache,
  IIndicatorCache,
  INewsCache,
  IndicatorCacheReadInput,
  NewsCacheReadInput,
  QuoteCacheReadInput,
  QuoteCacheWriteInput,
} from "./domain/ports/cache.port";

// ── Asset resolution port ──────────────────────────────────────────
export type { IAssetResolver } from "./domain/ports/asset-resolution.port";
