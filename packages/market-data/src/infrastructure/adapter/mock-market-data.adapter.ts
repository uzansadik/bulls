/**
 * @openbulls/market-data — `MockMarketDataAdapter`.
 *
 * Deterministic in-memory adapter that returns plausible synthetic
 * data for every capability. Used by:
 *
 *   - tests (the application query layer can be wired without
 *     hitting the network),
 *   - local development when no API key is configured,
 *   - the provider router's fallback terminal, so every chain ends
 *     in a working adapter instead of a hard error.
 *
 * Data is generated from a hash of the input symbol/date so the same
 * query always returns the same values. The output is *not* meant to
 * represent real market activity.
 */
import { type Result, ok } from "@openbulls/shared";
import { AssetSymbol, Currency, ProviderName, StatementType } from "../../domain/brands";
import type { Candle } from "../../domain/candle";
import type { FinancialRatio } from "../../domain/financial-ratio";
import type { FinancialStatement } from "../../domain/financial-statement";
import type { FxRate } from "../../domain/fx-rate";
import type { NewsItem } from "../../domain/news";
import type { Quote } from "../../domain/quote";
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

const MOCK_PROVIDER = ProviderName("mock");

const ALL_CAPABILITIES: ReadonlySet<AdapterCapability> = new Set<AdapterCapability>([
  "candles",
  "quote",
  "financial_statements",
  "financial_ratios",
  "fx",
  "news",
]);

/** Stable hash of a string used to seed deterministic mock data. */
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Pseudo-random but deterministic — advances with an index. */
function prng(seed: number, i: number): number {
  const x = Math.sin(seed + i * 9301) * 10000;
  return x - Math.floor(x);
}

function basePriceFor(symbol: string): number {
  const h = hashCode(symbol);
  return 50 + (h % 450); // 50..500
}

export class MockMarketDataAdapter implements MarketDataAdapter {
  readonly provider = MOCK_PROVIDER;
  readonly capabilities = ALL_CAPABILITIES;

  async getCandles(input: GetCandlesInput): Promise<Result<Candle[], never>> {
    const seed = hashCode(`${input.symbol}:${input.interval}`);
    const base = basePriceFor(input.symbol);
    const intervalMs = inferIntervalMs(input.interval);
    const bars: Candle[] = [];
    const startMs = alignToDay(input.from).getTime();
    const endMs = input.to.getTime();
    let prev = base;

    let i = 0;
    for (let t = startMs; t <= endMs; t += intervalMs) {
      const drift = (prng(seed, i) - 0.5) * base * 0.04; // ±2%
      const open = prev;
      const close = Math.max(0.01, prev + drift);
      const high = Math.max(open, close) + prng(seed, i + 0.5) * base * 0.01;
      const low = Math.min(open, close) - prng(seed, i + 0.6) * base * 0.01;
      const volume = Math.round(prng(seed, i + 0.7) * 1_000_000);
      const openTime = new Date(t);
      const closeTime = new Date(t + intervalMs - 1);
      bars.push({
        symbol: AssetSymbol(input.symbol),
        interval: input.interval,
        openTime,
        closeTime,
        open,
        high,
        low,
        close,
        volume,
        provider: MOCK_PROVIDER,
      });
      prev = close;
      i++;
    }
    return ok(bars);
  }

  async getQuote(input: GetQuoteInput): Promise<Result<Quote, never>> {
    const base = basePriceFor(input.symbol);
    const seed = hashCode(input.symbol);
    const drift = (prng(seed, Math.floor(Date.now() / 86_400_000)) - 0.5) * base * 0.04;
    const price = base + drift;
    const quote: Quote = {
      symbol: AssetSymbol(input.symbol),
      price,
      currency: Currency("USD"),
      asOf: new Date(),
      provider: MOCK_PROVIDER,
      delayed: false,
      dayHigh: price + prng(seed, 1) * base * 0.01,
      dayLow: price - prng(seed, 2) * base * 0.01,
      dayChange: drift,
      dayChangePercent: drift / base,
      volume: Math.round(prng(seed, 3) * 1_000_000),
      marketState: "closed",
    };
    return ok(quote);
  }

  async getFinancialStatements(
    input: GetFinancialStatementsInput,
  ): Promise<Result<FinancialStatement[], never>> {
    const limit = input.limit ?? 4;
    const statements: FinancialStatement[] = [];
    const now = new Date();
    for (let i = 0; i < limit; i++) {
      const periodEnd = new Date(now);
      periodEnd.setFullYear(now.getFullYear() - i);
      statements.push({
        symbol: AssetSymbol(input.symbol),
        statementType: StatementType(input.statementType),
        period: input.period,
        periodEnd,
        fiscalYear: now.getFullYear() - i,
        currency: Currency("USD"),
        rawData: { mock: true, index: i },
        provider: MOCK_PROVIDER,
      });
    }
    return ok(statements);
  }

  async getFinancialRatios(
    input: GetFinancialRatiosInput,
  ): Promise<Result<FinancialRatio[], never>> {
    const limit = input.limit ?? 4;
    const ratios: FinancialRatio[] = [];
    const now = new Date();
    for (let i = 0; i < limit; i++) {
      const periodEnd = new Date(now);
      periodEnd.setFullYear(now.getFullYear() - i);
      ratios.push({
        symbol: AssetSymbol(input.symbol),
        periodEnd,
        period: input.period,
        ratios: {
          currentRatio: 1.2 + i * 0.1,
          peRatio: 15 + i,
          debtToEquity: 0.5 + i * 0.05,
        },
        provider: MOCK_PROVIDER,
      });
    }
    return ok(ratios);
  }

  async getFxRate(input: GetFxRateInput): Promise<Result<FxRate, never>> {
    const normalized = `${input.base}${input.quote}`;
    const seed = hashCode(normalized);
    const rate = 0.5 + prng(seed, 0) * 2; // 0.5..2.5
    return ok({
      base: Currency(input.base),
      quote: Currency(input.quote),
      rate,
      asOf: input.asOf ?? new Date(),
      provider: MOCK_PROVIDER,
    });
  }

  async getNews(input: GetNewsInput): Promise<Result<NewsItem[], never>> {
    const seed = hashCode(input.symbol ?? "general");
    const items: NewsItem[] = [];
    const limit = input.limit ?? 5;
    for (let i = 0; i < limit; i++) {
      items.push({
        title: `Mock news ${i + 1} for ${input.symbol ?? "market"}`,
        url: `https://mock.example.com/${seed}/${i}`,
        source: "mock-source",
        publishedAt: new Date(input.to.getTime() - i * 3_600_000),
        summary: `Synthetic headline ${i + 1}.`,
        language: "en",
        symbol: input.symbol ? AssetSymbol(input.symbol) : null,
        sentiment: prng(seed, i) * 2 - 1,
        provider: MOCK_PROVIDER,
      });
    }
    return ok(items);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Approximate interval → millisecond mapping. Unknown intervals → 1 day. */
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

function alignToDay(d: Date): Date {
  const aligned = new Date(d);
  aligned.setUTCHours(0, 0, 0, 0);
  return aligned;
}
