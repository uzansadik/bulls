/**
 * @openbulls/market-data — Yahoo Finance adapter.
 *
 * Uses the **keyless unofficial** `query1.finance.yahoo.com` endpoint
 * — no API key required. The official Yahoo Finance API was retired
 * in 2023; the `query1` chart endpoint is the de-facto replacement
 * used by most open-source clients (yfinance, etc.).
 *
 * Capabilities: `candles` + `quote`. Yahoo does not expose a public
 * fundamental-statements endpoint, so financial_statements / ratios
 * return `UnsupportedCapabilityError` and the router falls through to
 * SEC (US) or KAP (BIST).
 *
 * Yahoo also does not expose a reliable FX or news endpoint, so
 * those return `UnsupportedCapabilityError` as well.
 *
 * User-Agent is required — `query1` returns 429 / empty body when the
 * caller looks like a server-side fetch without a UA.
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
import { parseCandle } from "../../domain/schemas/candle.schema";
import type { YahooChartResponse } from "../../domain/schemas/yahoo.schema";
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

const YAHOO_PROVIDER = ProviderName("yahoo");
const YAHOO_BASE = "https://query1.finance.yahoo.com";

const YAHOO_CAPABILITIES: ReadonlySet<AdapterCapability> = new Set<AdapterCapability>([
  "candles",
  "quote",
]);

/** Map our internal interval enum → Yahoo's `interval` query param. */
function yahooInterval(interval: string): string {
  switch (interval) {
    case "1m":
      return "1m";
    case "5m":
      return "5m";
    case "15m":
      return "15m";
    case "30m":
      return "30m";
    case "1h":
      return "60m";
    case "4h":
      return "60m"; // Yahoo doesn't have native 4h — fetch 1h and downsample
    case "1d":
      return "1d";
    case "1w":
      return "1wk";
    case "1mo":
      return "1mo";
    default:
      return "1d";
  }
}

/** Pick a Yahoo `range` so that the requested `[from, to]` window fits. */
function yahooRange(from: Date, to: Date): string {
  const days = Math.ceil((to.getTime() - from.getTime()) / 86_400_000);
  if (days <= 1) return "1d";
  if (days <= 5) return "5d";
  if (days <= 30) return "1mo";
  if (days <= 90) return "3mo";
  if (days <= 180) return "6mo";
  if (days <= 365) return "1y";
  if (days <= 730) return "2y";
  if (days <= 1825) return "5y";
  return "10y";
}

export class YahooFinanceAdapter implements MarketDataAdapter {
  readonly provider = YAHOO_PROVIDER;
  readonly capabilities = YAHOO_CAPABILITIES;

  private readonly http: HttpClient;
  private readonly logger: LoggerLike;
  private readonly userAgent: string;

  constructor(http: HttpClient, options: { logger?: LoggerLike; userAgent?: string } = {}) {
    this.http = http;
    this.logger = options.logger ?? noopLogger;
    this.userAgent =
      options.userAgent ?? "Mozilla/5.0 (compatible; Openbulls/1.0; +https://openbulls.app)";
  }

  async getCandles(input: GetCandlesInput): Promise<Result<Candle[], MarketDataError>> {
    const symbol = String(input.symbol);
    const url = `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}`;
    const result = await this.http.request<YahooChartResponse>({
      url,
      method: "GET",
      headers: { "User-Agent": this.userAgent },
      query: {
        interval: yahooInterval(String(input.interval)),
        range: yahooRange(input.from, input.to),
        events: "div,splits",
      },
    });
    if (!result.ok) return result;

    const raw = result.value.data;
    const chartError = raw?.chart?.error;
    if (chartError) {
      return err(
        new SymbolNotFoundError({
          provider: YAHOO_PROVIDER,
          symbol: input.symbol,
          message: chartError.description ?? chartError.code,
        }),
      );
    }
    const first = raw?.chart?.result?.[0];
    if (!first) {
      return err(
        new SymbolNotFoundError({
          provider: YAHOO_PROVIDER,
          symbol: input.symbol,
          message: "Yahoo returned no chart result",
        }),
      );
    }

    const candles: Candle[] = [];
    const timestamps = first.timestamp ?? [];
    const quote = first.indicators?.quote?.[0];
    const adjclose = first.indicators?.adjclose?.[0]?.adjclose;
    void adjclose; // referenced inside the loop after ?? coalescing
    if (!quote) {
      this.logger.warn("yahoo.no_quote_block", { symbol });
      return ok([]);
    }

    const opens = quote.open ?? [];
    const highs = quote.high ?? [];
    const lows = quote.low ?? [];
    const closes = quote.close ?? [];
    const volumes = quote.volume ?? [];
    const adjcloses = adjclose ?? [];

    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i];
      if (ts === undefined) continue;
      const open = opens[i] ?? null;
      const high = highs[i] ?? null;
      const low = lows[i] ?? null;
      const closeRaw = closes[i] ?? null;
      const close = adjcloses[i] ?? closeRaw; // adjusted close if available
      const volume = volumes[i] ?? null;
      if (
        open == null ||
        high == null ||
        low == null ||
        close == null ||
        !Number.isFinite(open) ||
        !Number.isFinite(high) ||
        !Number.isFinite(low) ||
        !Number.isFinite(close)
      ) {
        continue; // skip incomplete bars
      }
      candles.push(
        parseCandle({
          symbol: String(input.symbol),
          interval: String(input.interval),
          openTime: new Date(ts * 1000),
          closeTime: new Date((ts + 60) * 1000), // overwritten by interval below
          open,
          high,
          low,
          close,
          volume,
          provider: "yahoo",
        }),
      );
    }

    // Post-process: align closeTime to interval boundaries.
    const intervalMs = inferIntervalMs(String(input.interval));
    for (const c of candles) {
      c.closeTime.setTime(c.openTime.getTime() + intervalMs - 1);
    }

    // Filter to the requested window.
    const fromMs = input.from.getTime();
    const toMs = input.to.getTime();
    const filtered = candles.filter(
      (c) => c.openTime.getTime() <= toMs && c.closeTime.getTime() >= fromMs,
    );
    return ok(filtered);
  }

  async getQuote(input: GetQuoteInput): Promise<Result<Quote, MarketDataError>> {
    const symbol = String(input.symbol);
    const url = `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}`;
    const result = await this.http.request<YahooChartResponse>({
      url,
      method: "GET",
      headers: { "User-Agent": this.userAgent },
      query: { interval: "1d", range: "5d" },
    });
    if (!result.ok) return result;

    const meta = result.value.data?.chart?.result?.[0]?.meta;
    if (!meta) {
      return err(
        new SymbolNotFoundError({
          provider: YAHOO_PROVIDER,
          symbol: input.symbol,
          message: "Yahoo returned no meta block",
        }),
      );
    }

    const price = meta.regularMarketPrice ?? 0;
    const dayHigh = meta.regularMarketDayHigh ?? price;
    const dayLow = meta.regularMarketDayLow ?? price;
    const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const dayChange = price - previousClose;
    const dayChangePercent = previousClose > 0 ? dayChange / previousClose : 0;

    return ok({
      symbol: AssetSymbol(meta.symbol ?? symbol),
      price,
      currency: Currency(meta.currency ?? "USD"),
      asOf: new Date((meta.regularMarketTime ?? Math.floor(Date.now() / 1000)) * 1000),
      provider: YAHOO_PROVIDER,
      delayed: false,
      dayHigh,
      dayLow,
      dayChange,
      dayChangePercent,
      volume: meta.regularMarketVolume ?? 0,
      marketState: toMarketState(meta.marketState),
    });
  }

  // ── Unsupported capabilities ─────────────────────────────────────

  getFinancialStatements(
    _input: GetFinancialStatementsInput,
  ): Promise<Result<never, MarketDataError>> {
    return Promise.resolve(
      err(
        new UnsupportedCapabilityError({
          provider: YAHOO_PROVIDER,
          capability: "financial_statements",
        }),
      ),
    );
  }

  getFinancialRatios(_input: GetFinancialRatiosInput): Promise<Result<never, MarketDataError>> {
    return Promise.resolve(
      err(
        new UnsupportedCapabilityError({
          provider: YAHOO_PROVIDER,
          capability: "financial_ratios",
        }),
      ),
    );
  }

  getFxRate(_input: GetFxRateInput): Promise<Result<never, MarketDataError>> {
    return Promise.resolve(
      err(
        new UnsupportedCapabilityError({
          provider: YAHOO_PROVIDER,
          capability: "fx",
        }),
      ),
    );
  }

  getNews(_input: GetNewsInput): Promise<Result<never, MarketDataError>> {
    return Promise.resolve(
      err(
        new UnsupportedCapabilityError({
          provider: YAHOO_PROVIDER,
          capability: "news",
        }),
      ),
    );
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Narrow Yahoo's free-form market-state string to our internal enum. */
function toMarketState(raw: string | undefined): MarketState | null {
  if (!raw) return null;
  const normalized = raw.toLowerCase();
  if (normalized === "pre" || normalized === "premarket") return "pre";
  if (normalized === "regular" || normalized === "regularhours") return "regular";
  if (normalized === "post" || normalized === "posthours" || normalized === "postmarket")
    return "post";
  if (normalized === "closed" || normalized === "closedhours") return "closed";
  return null;
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
