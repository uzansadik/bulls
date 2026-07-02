/**
 * @openbulls/market-data — cache port (interface).
 *
 * Cache is write-through from the application query layer: a cache
 * miss falls through to the provider router, and a successful fetch
 * is written before returning. The cache is the only stateful piece
 * of the application — adapter implementations (in-memory, Drizzle)
 * live in `infrastructure/cache/`.
 *
 * The shape is per-VO so each cache can choose its own storage
 * granularity. Candles are stored by (symbol, interval) bucket and
 * served with a time-range filter at read time. Quotes are stored as
 * latest-snapshot-per-symbol (no time series).
 *
 * All methods return `Result<T, MarketDataError>`; the caller
 * (query layer) propagates `CacheError` from infrastructure failures
 * up to the route handler.
 */
import type { Result } from "@openbulls/shared";
import type { AssetSymbol, Interval, ProviderName } from "../brands";
import type { Candle } from "../candle";
import type { MarketDataError } from "../errors";
import type { FinancialRatio } from "../financial-ratio";
import type { FinancialStatement } from "../financial-statement";
import type { FxRate } from "../fx-rate";
import type { Indicator } from "../indicator";
import type { NewsItem } from "../news";
import type { Quote } from "../quote";

// ── Candles ─────────────────────────────────────────────────────────
export interface CandleCacheReadInput {
  readonly symbol: AssetSymbol;
  readonly interval: Interval;
  readonly from: Date;
  readonly to: Date;
}
export interface CandleCacheWriteInput {
  readonly symbol: AssetSymbol;
  readonly interval: Interval;
  readonly candles: readonly Candle[];
  readonly provider: ProviderName;
}
export interface ICandleCache {
  read(input: CandleCacheReadInput): Promise<Result<Candle[], MarketDataError>>;
  write(input: CandleCacheWriteInput): Promise<Result<void, MarketDataError>>;
  /** Freshness TTL in milliseconds for a given interval. */
  freshnessMs(interval: Interval): number;
}

// ── Quote ───────────────────────────────────────────────────────────
export interface QuoteCacheReadInput {
  readonly symbol: AssetSymbol;
  /** Maximum age in milliseconds since `asOf`. */
  readonly maxAgeMs: number;
}
export interface QuoteCacheWriteInput {
  readonly quote: Quote;
}
export interface IQuoteCache {
  read(input: QuoteCacheReadInput): Promise<Result<Quote | null, MarketDataError>>;
  write(input: QuoteCacheWriteInput): Promise<Result<void, MarketDataError>>;
}

// ── FX rate ─────────────────────────────────────────────────────────
export interface FxRateCacheReadInput {
  readonly base: string;
  readonly quote: string;
  readonly maxAgeMs: number;
}
export interface FxRateCacheWriteInput {
  readonly rate: FxRate;
}
export interface IFxRateCache {
  read(input: FxRateCacheReadInput): Promise<Result<FxRate | null, MarketDataError>>;
  write(input: FxRateCacheWriteInput): Promise<Result<void, MarketDataError>>;
}

// ── Financial statement / ratio ─────────────────────────────────────
export interface FinancialCacheReadInput {
  readonly symbol: AssetSymbol;
  readonly period: "quarterly" | "annual";
  readonly limit: number;
}
export interface IFinancialStatementCache {
  read(input: FinancialCacheReadInput): Promise<Result<FinancialStatement[], MarketDataError>>;
  write(input: {
    readonly statements: readonly FinancialStatement[];
  }): Promise<Result<void, MarketDataError>>;
}
export interface IFinancialRatioCache {
  read(input: FinancialCacheReadInput): Promise<Result<FinancialRatio[], MarketDataError>>;
  write(input: {
    readonly ratios: readonly FinancialRatio[];
  }): Promise<Result<void, MarketDataError>>;
}

// ── Indicator ───────────────────────────────────────────────────────
export interface IndicatorCacheReadInput {
  readonly symbol: AssetSymbol;
  readonly type: import("../brands").IndicatorType;
  readonly interval: Interval;
}
export interface IIndicatorCache {
  read(input: IndicatorCacheReadInput): Promise<Result<Indicator | null, MarketDataError>>;
  write(input: { readonly indicator: Indicator }): Promise<Result<void, MarketDataError>>;
}

// ── News ────────────────────────────────────────────────────────────
export interface NewsCacheReadInput {
  readonly symbol: AssetSymbol | null;
  readonly from: Date;
  readonly to: Date;
}
export interface NewsCacheWriteInput {
  readonly items: readonly NewsItem[];
}
export interface INewsCache {
  read(input: NewsCacheReadInput): Promise<Result<NewsItem[], MarketDataError>>;
  write(input: NewsCacheWriteInput): Promise<Result<void, MarketDataError>>;
}
