/**
 * @openbulls/market-data — uniform `MarketDataAdapter` port.
 *
 * Every external provider (Yahoo Finance, Twelve Data, KAP, TCMB,
 * SEC EDGAR) implements this single interface. Provider-specific
 * shape differences are absorbed by the adapter's internal
 * `parseXxx` helpers; the application layer above (queries, router,
 * agents) never branches by provider.
 *
 * The adapter does NOT do rate limiting, caching, or retries — those
 * live in `HttpClient` (rate limit + retry) and the application
 * query layer (cache). The router walks the chain on capability
 * mismatches (`UnsupportedCapabilityError`) and fatal HTTP errors
 * (4xx non-429).
 *
 * `capabilities` lists which methods this adapter actually supports;
 * an adapter called for an unsupported capability should return
 * `UnsupportedCapabilityError` so the router can fall through.
 */
import type { Result } from "@openbulls/shared";
import type { AssetSymbol, Interval, ProviderName, StatementType } from "../../domain/brands";
import type { Candle } from "../../domain/candle";
import type { MarketDataError } from "../../domain/errors";
import type { FinancialRatio } from "../../domain/financial-ratio";
import type { FinancialStatement } from "../../domain/financial-statement";
import type { FxRate } from "../../domain/fx-rate";
import type { NewsItem } from "../../domain/news";
import type { Quote } from "../../domain/quote";

// ── Input shapes ────────────────────────────────────────────────────

export interface GetCandlesInput {
  readonly symbol: AssetSymbol;
  readonly interval: Interval;
  /** Inclusive lower bound. */
  readonly from: Date;
  /** Inclusive upper bound. */
  readonly to: Date;
  /** Split/dividend adjusted. Default true. */
  readonly adjusted?: boolean;
}

export interface GetQuoteInput {
  readonly symbol: AssetSymbol;
}

export interface GetFinancialStatementsInput {
  readonly symbol: AssetSymbol;
  readonly statementType: StatementType;
  readonly period: "quarterly" | "annual";
  readonly limit?: number;
}

export interface GetFinancialRatiosInput {
  readonly symbol: AssetSymbol;
  readonly period: "quarterly" | "annual";
  readonly limit?: number;
}

export interface GetFxRateInput {
  readonly base: string;
  readonly quote: string;
  readonly asOf?: Date;
}

export interface GetNewsInput {
  readonly symbol?: AssetSymbol;
  readonly from: Date;
  readonly to: Date;
  readonly limit?: number;
}

// ── Adapter capability / port ───────────────────────────────────────

export type AdapterCapability =
  | "candles"
  | "quote"
  | "financial_statements"
  | "financial_ratios"
  | "fx"
  | "news";

export interface MarketDataAdapter {
  readonly provider: ProviderName;
  readonly capabilities: ReadonlySet<AdapterCapability>;

  getCandles(input: GetCandlesInput): Promise<Result<Candle[], MarketDataError>>;
  getQuote(input: GetQuoteInput): Promise<Result<Quote, MarketDataError>>;
  getFinancialStatements(
    input: GetFinancialStatementsInput,
  ): Promise<Result<FinancialStatement[], MarketDataError>>;
  getFinancialRatios(
    input: GetFinancialRatiosInput,
  ): Promise<Result<FinancialRatio[], MarketDataError>>;
  getFxRate(input: GetFxRateInput): Promise<Result<FxRate, MarketDataError>>;
  getNews(input: GetNewsInput): Promise<Result<NewsItem[], MarketDataError>>;
}
