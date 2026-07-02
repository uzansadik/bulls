/**
 * @openbulls/market-data — Twelve Data adapter.
 *
 * Twelve Data is a paid market-data aggregator with broad coverage:
 * stocks, ETFs, forex, crypto, and — at paid tiers — fundamentals.
 *
 * Free-tier rate limit: 8 requests / minute / API key, 800/day.
 * Paid tiers scale the per-minute cap; the `TWELVE_DATA_API_KEY` env
 * is required at construction time.
 *
 * Capabilities:
 *
 *   - `candles`        → /time_series (OHLCV time-series)
 *   - `quote`          → /quote (latest snapshot)
 *
 * Other capabilities (`financial_statements`, `financial_ratios`,
 * `fx`, `news`) return `UnsupportedCapabilityError`; the router
 * falls through to Yahoo / SEC / TCMB for those. FX is supported
 * by Twelve Data's time_series + FX-symbol convention, but the
 * primary FX chain is TCMB → Yahoo → mock; routing FX through
 * Twelve Data burns quota.
 *
 * Symbol format: provider-native (e.g. `AAPL`, `EUR/USD`, `BTC/USD`).
 */
import { type Result, err, ok } from "@openbulls/shared";
import { AssetSymbol, Currency, ProviderName } from "../../domain/brands";
import type { Candle } from "../../domain/candle";
import {
  type MarketDataError,
  SymbolNotFoundError,
  UnsupportedCapabilityError,
} from "../../domain/errors";
import type { MarketState, Quote } from "../../domain/quote";
import type { HttpClient } from "../http/http-client";
import type { LoggerLike } from "../log";
import { noopLogger } from "../log";
import type {
  AdapterCapability,
  GetCandlesInput,
  GetFinancialRatiosInput,
  GetFinancialStatementsInput,
  GetFxRateInput,
  GetNewsInput,
  GetQuoteInput,
  MarketDataAdapter,
} from "./market-data-adapter.port";

const TWELVEDATA_PROVIDER = ProviderName("twelvedata");
const TWELVEDATA_BASE = "https://api.twelvedata.com";

const TWELVEDATA_CAPABILITIES: ReadonlySet<AdapterCapability> = new Set<AdapterCapability>([
  "candles",
  "quote",
]);

interface TwelveDataOptions {
  readonly apiKey: string;
  readonly logger?: LoggerLike;
}

/** Map our internal interval → Twelve Data's `interval` query param. */
function twelveInterval(interval: string): string {
  switch (interval) {
    case "1m":
      return "1min";
    case "5m":
      return "5min";
    case "15m":
      return "15min";
    case "30m":
      return "30min";
    case "1h":
      return "1h";
    case "4h":
      return "4h";
    case "1d":
      return "1day";
    case "1w":
      return "1week";
    case "1mo":
      return "1month";
    default:
      return "1day";
  }
}

export class TwelveDataAdapter implements MarketDataAdapter {
  readonly provider = TWELVEDATA_PROVIDER;
  readonly capabilities = TWELVEDATA_CAPABILITIES;

  private readonly http: HttpClient;
  private readonly apiKey: string;
  private readonly logger: LoggerLike;

  constructor(http: HttpClient, options: TwelveDataOptions) {
    if (!options.apiKey) {
      throw new Error("TwelveDataAdapter requires an apiKey");
    }
    this.http = http;
    this.apiKey = options.apiKey;
    this.logger = options.logger ?? noopLogger;
  }

  async getCandles(input: GetCandlesInput): Promise<Result<Candle[], MarketDataError>> {
    const symbol = String(input.symbol);
    const url = `${TWELVEDATA_BASE}/time_series`;
    const result = await this.http.request<TwelveTimeSeriesResponse>({
      url,
      method: "GET",
      query: {
        symbol,
        interval: twelveInterval(String(input.interval)),
        start_date: formatDate(input.from),
        end_date: formatDate(input.to),
        apikey: this.apiKey,
        outputsize: 5000,
        order: "ASC",
      },
    });
    if (!result.ok) return result;

    const body = result.value.data;
    if (body.status === "error" || !body.values) {
      return err(
        new SymbolNotFoundError({
          provider: TWELVEDATA_PROVIDER,
          symbol: input.symbol,
          message: body.message ?? "no time-series returned",
        }),
      );
    }

    const intervalMs = inferIntervalMs(String(input.interval));
    const candles: Candle[] = [];
    for (const row of body.values) {
      const open = Number.parseFloat(row.open ?? "");
      const high = Number.parseFloat(row.high ?? "");
      const low = Number.parseFloat(row.low ?? "");
      const close = Number.parseFloat(row.close ?? "");
      const volume = row.volume ? Number.parseFloat(row.volume) : null;
      if (
        !Number.isFinite(open) ||
        !Number.isFinite(high) ||
        !Number.isFinite(low) ||
        !Number.isFinite(close)
      ) {
        continue;
      }
      const ts = new Date(row.datetime);
      if (Number.isNaN(ts.getTime())) continue;
      const openTime = new Date(ts.getTime());
      const closeTime = new Date(ts.getTime() + intervalMs - 1);
      candles.push({
        symbol: AssetSymbol(symbol),
        interval: input.interval,
        openTime,
        closeTime,
        open,
        high,
        low,
        close,
        volume,
        provider: TWELVEDATA_PROVIDER,
      });
    }

    // Twelve Data returns ascending; consumers usually expect descending.
    candles.reverse();
    return ok(candles);
  }

  async getQuote(input: GetQuoteInput): Promise<Result<Quote, MarketDataError>> {
    const symbol = String(input.symbol);
    const url = `${TWELVEDATA_BASE}/quote`;
    const result = await this.http.request<TwelveQuoteResponse>({
      url,
      method: "GET",
      query: { symbol, apikey: this.apiKey },
    });
    if (!result.ok) return result;

    const body = result.value.data;
    if (!body || body.status === "error") {
      return err(
        new SymbolNotFoundError({
          provider: TWELVEDATA_PROVIDER,
          symbol: input.symbol,
          message: body?.message ?? "no quote returned",
        }),
      );
    }

    const price = Number.parseFloat(body.close ?? body.previous_close ?? "NaN");
    const dayHigh = Number.parseFloat(body.high ?? "NaN");
    const dayLow = Number.parseFloat(body.low ?? "NaN");
    const prev = Number.parseFloat(body.previous_close ?? "NaN");
    const volume = Number.parseInt(body.volume ?? "0", 10);
    if (!Number.isFinite(price)) {
      return err(
        new SymbolNotFoundError({
          provider: TWELVEDATA_PROVIDER,
          symbol: input.symbol,
          message: "Twelve Data quote missing numeric price",
        }),
      );
    }

    return ok({
      symbol: AssetSymbol(body.symbol ?? symbol),
      price,
      currency: Currency(body.currency ?? "USD"),
      asOf: body.timestamp ? new Date(body.timestamp * 1000) : new Date(),
      provider: TWELVEDATA_PROVIDER,
      delayed: body.is_real_time === false,
      dayHigh: Number.isFinite(dayHigh) ? dayHigh : null,
      dayLow: Number.isFinite(dayLow) ? dayLow : null,
      dayChange: Number.isFinite(prev) ? price - prev : null,
      dayChangePercent: Number.isFinite(prev) && prev > 0 ? (price - prev) / prev : null,
      volume: Number.isFinite(volume) ? volume : null,
      marketState: toMarketState(body.is_market_open),
    });
  }

  // ── Unsupported capabilities ─────────────────────────────────────

  getFinancialStatements(
    _input: GetFinancialStatementsInput,
  ): Promise<Result<never, MarketDataError>> {
    return Promise.resolve(
      err(
        new UnsupportedCapabilityError({
          provider: TWELVEDATA_PROVIDER,
          capability: "financial_statements",
        }),
      ),
    );
  }

  getFinancialRatios(_input: GetFinancialRatiosInput): Promise<Result<never, MarketDataError>> {
    return Promise.resolve(
      err(
        new UnsupportedCapabilityError({
          provider: TWELVEDATA_PROVIDER,
          capability: "financial_ratios",
        }),
      ),
    );
  }

  getFxRate(_input: GetFxRateInput): Promise<Result<never, MarketDataError>> {
    return Promise.resolve(
      err(
        new UnsupportedCapabilityError({
          provider: TWELVEDATA_PROVIDER,
          capability: "fx",
        }),
      ),
    );
  }

  getNews(_input: GetNewsInput): Promise<Result<never, MarketDataError>> {
    return Promise.resolve(
      err(
        new UnsupportedCapabilityError({
          provider: TWELVEDATA_PROVIDER,
          capability: "news",
        }),
      ),
    );
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = pad2(d.getUTCMonth() + 1);
  const dd = pad2(d.getUTCDate());
  return `${yyyy}-${mm}-${dd}`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function inferIntervalMs(interval: string): number {
  switch (interval) {
    case "1m":
      return 60_000;
    case "5m":
      return 5 * 60_000;
    case "15m":
      return 15 * 60_000;
    case "30m":
      return 30 * 60_000;
    case "1h":
      return 60 * 60_000;
    case "4h":
      return 4 * 60 * 60_000;
    case "1d":
      return 24 * 60 * 60_000;
    case "1w":
      return 7 * 24 * 60 * 60_000;
    case "1mo":
      return 30 * 24 * 60 * 60_000;
    default:
      return 24 * 60 * 60_000;
  }
}

function toMarketState(isOpen: boolean | undefined): MarketState | null {
  if (isOpen === undefined) return null;
  return isOpen ? "regular" : "closed";
}

// ── Response shapes ─────────────────────────────────────────────────

interface TwelveTimeSeriesResponse {
  readonly status?: string;
  readonly message?: string;
  readonly values?: ReadonlyArray<{
    readonly datetime: string;
    readonly open?: string;
    readonly high?: string;
    readonly low?: string;
    readonly close?: string;
    readonly volume?: string;
  }>;
}

interface TwelveQuoteResponse {
  readonly status?: string;
  readonly message?: string;
  readonly symbol?: string;
  readonly close?: string;
  readonly high?: string;
  readonly low?: string;
  readonly previous_close?: string;
  readonly volume?: string;
  readonly currency?: string;
  readonly timestamp?: number;
  readonly is_real_time?: boolean;
  readonly is_market_open?: boolean;
}
