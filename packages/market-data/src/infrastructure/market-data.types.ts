/**
 * @openbulls/market-data — shared types for the composition root.
 *
 * `MarketDataDeps` is the dependency surface an application query
 * depends on. `MarketDataServices` is the bound surface the composition
 * root returns to its callers — each query is a closure that closes
 * over the deps, so callers don't have to thread them.
 */
import type { Result } from "@openbulls/shared";
import type { Candle } from "../domain/candle";
import type { MarketDataError } from "../domain/errors";
import type { FinancialRatio } from "../domain/financial-ratio";
import type { FinancialStatement } from "../domain/financial-statement";
import type { FxRate } from "../domain/fx-rate";
import type { Indicator } from "../domain/indicator";
import type { NewsItem } from "../domain/news";
import type { IAssetResolver } from "../domain/ports/asset-resolution.port";
import type {
  ICandleCache,
  IFinancialRatioCache,
  IFinancialStatementCache,
  IFxRateCache,
  IIndicatorCache,
  INewsCache,
  IQuoteCache,
} from "../domain/ports/cache.port";
import type { IProviderRouter } from "../domain/ports/router.port";
import type { Quote } from "../domain/quote";
import type {
  GetCandlesInput,
  GetFinancialRatiosInput,
  GetFinancialStatementsInput,
  GetFxRateInput,
  GetNewsInput,
  GetQuoteInput,
} from "./adapter/market-data-adapter.port";

export interface MarketDataDeps {
  readonly candleCache: ICandleCache;
  readonly quoteCache: IQuoteCache;
  readonly fxCache: IFxRateCache;
  readonly financialStatementCache: IFinancialStatementCache;
  readonly financialRatioCache: IFinancialRatioCache;
  readonly indicatorCache: IIndicatorCache;
  readonly newsCache: INewsCache;
  readonly assetResolver: IAssetResolver;
  readonly router: IProviderRouter;
  readonly now: () => Date;
}

export interface MarketDataServices {
  readonly getCandles: (input: GetCandlesInput) => Promise<Result<Candle[], MarketDataError>>;
  readonly getQuote: (
    input: GetQuoteInput & { readonly maxAgeMs?: number },
  ) => Promise<Result<Quote, MarketDataError>>;
  readonly getFinancialStatements: (
    input: GetFinancialStatementsInput,
  ) => Promise<Result<FinancialStatement[], MarketDataError>>;
  readonly getFinancialRatios: (
    input: GetFinancialRatiosInput,
  ) => Promise<Result<FinancialRatio[], MarketDataError>>;
  readonly getFxRate: (
    input: GetFxRateInput & { readonly maxAgeMs?: number },
  ) => Promise<Result<FxRate, MarketDataError>>;
  readonly getNews: (input: GetNewsInput) => Promise<Result<NewsItem[], MarketDataError>>;
  readonly calculateRsi: (
    input: import("../application/calculate-rsi.query").CalculateRsiInput,
  ) => Promise<Result<Indicator, MarketDataError>>;
  readonly calculateMacd: (
    input: import("../application/calculate-macd.query").CalculateMacdInput,
  ) => Promise<Result<Indicator, MarketDataError>>;
  readonly calculateSma: (
    input: import("../application/calculate-sma.query").CalculateSmaInput,
  ) => Promise<Result<Indicator, MarketDataError>>;
  /** Underlying router for advanced callers / tests. */
  readonly getRouter: () => IProviderRouter;
  /** Underlying deps surface for callers that want to compose their own queries. */
  readonly deps: MarketDataDeps;
}
