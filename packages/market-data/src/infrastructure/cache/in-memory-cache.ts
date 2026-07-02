/**
 * @openbulls/market-data — in-memory cache implementations.
 *
 * Process-local Map-backed caches for tests, local dev, and single-node
 * deployments. The Drizzle-backed adapters (in `drizzle-*.cache.ts`)
 * swap in for multi-instance production.
 *
 * All caches return `Result<T, MarketDataError>`. In-memory caches
 * essentially never fail; the Result wrapper keeps the surface
 * uniform so the application query layer doesn't branch.
 *
 * Freshness TTL is interval-aware for candles (1m ⇒ 60s, 1d ⇒ 6h)
 * and explicit for quotes/FX (caller-supplied `maxAgeMs`).
 */
import { type Result, ok } from "@openbulls/shared";
import type { AssetSymbol, Interval } from "../../domain/brands";
import type { Candle } from "../../domain/candle";
import type { MarketDataError } from "../../domain/errors";
import type { FinancialRatio } from "../../domain/financial-ratio";
import type { FinancialStatement } from "../../domain/financial-statement";
import type { FxRate } from "../../domain/fx-rate";
import type { Indicator } from "../../domain/indicator";
import type { NewsItem } from "../../domain/news";
import type {
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
  IQuoteCache,
  IndicatorCacheReadInput,
  NewsCacheReadInput,
  QuoteCacheReadInput,
  QuoteCacheWriteInput,
} from "../../domain/ports/cache.port";
import type { Quote } from "../../domain/quote";

// ── Candles ─────────────────────────────────────────────────────────

export class InMemoryCandleCache implements ICandleCache {
  private readonly buckets = new Map<string, { candles: Candle[]; writtenAt: number }>();

  freshnessMs(interval: Interval): number {
    return candleFreshnessMs(interval);
  }

  async read(input: CandleCacheReadInput): Promise<Result<Candle[], MarketDataError>> {
    const key = bucketKey(input.symbol, input.interval);
    const bucket = this.buckets.get(key);
    if (!bucket) return ok([]);

    const ttl = this.freshnessMs(input.interval);
    if (Date.now() - bucket.writtenAt > ttl) return ok([]);

    const filtered = bucket.candles.filter(
      (c) => c.openTime <= input.to && c.closeTime >= input.from,
    );
    return ok(filtered);
  }

  async write(input: CandleCacheWriteInput): Promise<Result<void, MarketDataError>> {
    const key = bucketKey(input.symbol, input.interval);
    this.buckets.set(key, {
      candles: [...input.candles],
      writtenAt: Date.now(),
    });
    return ok(undefined);
  }
}

function bucketKey(symbol: AssetSymbol, interval: Interval): string {
  return `${String(symbol)}::${String(interval)}`;
}

function candleFreshnessMs(interval: Interval): number {
  switch (String(interval)) {
    case "1m":
      return 60 * 1000;
    case "5m":
      return 5 * 60 * 1000;
    case "15m":
      return 15 * 60 * 1000;
    case "30m":
      return 30 * 60 * 1000;
    case "1h":
      return 60 * 60 * 1000;
    case "4h":
      return 4 * 60 * 60 * 1000;
    case "1d":
      return 6 * 60 * 60 * 1000;
    case "1w":
      return 24 * 60 * 60 * 1000;
    case "1mo":
      return 7 * 24 * 60 * 60 * 1000;
    default:
      return 60 * 60 * 1000;
  }
}

// ── Quote ───────────────────────────────────────────────────────────

export class InMemoryQuoteCache implements IQuoteCache {
  private readonly latest = new Map<AssetSymbol, { quote: Quote; writtenAt: number }>();

  async read(input: QuoteCacheReadInput): Promise<Result<Quote | null, MarketDataError>> {
    const entry = this.latest.get(input.symbol);
    if (!entry) return ok(null);
    if (Date.now() - entry.writtenAt > input.maxAgeMs) return ok(null);
    return ok(entry.quote);
  }

  async write(input: QuoteCacheWriteInput): Promise<Result<void, MarketDataError>> {
    this.latest.set(input.quote.symbol, {
      quote: input.quote,
      writtenAt: Date.now(),
    });
    return ok(undefined);
  }
}

// ── FX rate ─────────────────────────────────────────────────────────

export class InMemoryFxRateCache implements IFxRateCache {
  private readonly latest = new Map<string, { rate: FxRate; writtenAt: number }>();

  async read(input: FxRateCacheReadInput): Promise<Result<FxRate | null, MarketDataError>> {
    const key = `${input.base}${input.quote}`;
    const entry = this.latest.get(key);
    if (!entry) return ok(null);
    if (Date.now() - entry.writtenAt > input.maxAgeMs) return ok(null);
    return ok(entry.rate);
  }

  async write(input: FxRateCacheWriteInput): Promise<Result<void, MarketDataError>> {
    const key = `${String(input.rate.base)}${String(input.rate.quote)}`;
    this.latest.set(key, { rate: input.rate, writtenAt: Date.now() });
    return ok(undefined);
  }
}

// ── Financial statement / ratio ─────────────────────────────────────

export class InMemoryFinancialStatementCache implements IFinancialStatementCache {
  private readonly latest = new Map<
    string,
    { statements: FinancialStatement[]; writtenAt: number }
  >();

  async read(
    input: FinancialCacheReadInput,
  ): Promise<Result<FinancialStatement[], MarketDataError>> {
    const key = `${String(input.symbol)}::${input.period}`;
    const entry = this.latest.get(key);
    if (!entry) return ok([]);
    return ok(entry.statements.slice(0, input.limit));
  }

  async write(input: {
    readonly statements: readonly FinancialStatement[];
  }): Promise<Result<void, MarketDataError>> {
    if (input.statements.length === 0) return ok(undefined);
    const sym = String(input.statements[0]?.symbol ?? "");
    const period = input.statements[0]?.period ?? "quarterly";
    const key = `${sym}::${period}`;
    this.latest.set(key, {
      statements: [...input.statements],
      writtenAt: Date.now(),
    });
    return ok(undefined);
  }
}

export class InMemoryFinancialRatioCache implements IFinancialRatioCache {
  private readonly latest = new Map<string, { ratios: FinancialRatio[]; writtenAt: number }>();

  async read(input: FinancialCacheReadInput): Promise<Result<FinancialRatio[], MarketDataError>> {
    const key = `${String(input.symbol)}::${input.period}`;
    const entry = this.latest.get(key);
    if (!entry) return ok([]);
    return ok(entry.ratios.slice(0, input.limit));
  }

  async write(input: {
    readonly ratios: readonly FinancialRatio[];
  }): Promise<Result<void, MarketDataError>> {
    if (input.ratios.length === 0) return ok(undefined);
    const sym = String(input.ratios[0]?.symbol ?? "");
    const period = input.ratios[0]?.period ?? "quarterly";
    const key = `${sym}::${period}`;
    this.latest.set(key, {
      ratios: [...input.ratios],
      writtenAt: Date.now(),
    });
    return ok(undefined);
  }
}

// ── Indicator ───────────────────────────────────────────────────────

export class InMemoryIndicatorCache implements IIndicatorCache {
  private readonly latest = new Map<string, { indicator: Indicator; writtenAt: number }>();

  async read(input: IndicatorCacheReadInput): Promise<Result<Indicator | null, MarketDataError>> {
    const key = `${String(input.symbol)}::${String(input.type)}::${String(input.interval)}`;
    const entry = this.latest.get(key);
    if (!entry) return ok(null);
    // 24h TTL for computed indicators
    if (Date.now() - entry.writtenAt > 24 * 60 * 60 * 1000) return ok(null);
    return ok(entry.indicator);
  }

  async write(input: {
    readonly indicator: Indicator;
  }): Promise<Result<void, MarketDataError>> {
    const i = input.indicator;
    const key = `${String(i.symbol)}::${String(i.type)}::${String(i.interval)}`;
    this.latest.set(key, { indicator: i, writtenAt: Date.now() });
    return ok(undefined);
  }
}

// ── News ────────────────────────────────────────────────────────────

export class InMemoryNewsCache implements INewsCache {
  private readonly items: NewsItem[] = [];

  async read(input: NewsCacheReadInput): Promise<Result<NewsItem[], MarketDataError>> {
    const filtered = this.items.filter(
      (n) =>
        n.publishedAt >= input.from &&
        n.publishedAt <= input.to &&
        (input.symbol === null ? n.symbol === null : n.symbol === input.symbol),
    );
    return ok(filtered);
  }

  async write(
    input: NewsCacheReadInput extends never ? never : { readonly items: readonly NewsItem[] },
  ): Promise<Result<void, MarketDataError>> {
    for (const item of input.items) this.items.push(item);
    return ok(undefined);
  }
}
