import {
  calculateMacd,
  calculateRsi,
  calculateSma,
  getCandles,
  getFinancialRatios,
  getFinancialStatements,
  getFxRate,
  getNews,
  getQuote,
} from "../application";
/**
 * @openbulls/market-data — composition root.
 *
 * `createMarketDataServicesFromEnv` wires every adapter, cache, rate
 * limiter, and router into a bound `MarketDataServices` surface. It is
 * the only place where concrete implementations are chosen; everything
 * upstream of the composition root depends on ports.
 *
 * Env-driven decisions:
 *   - missing `*_API_KEY` envs skip that provider (the chain falls
 *     through naturally; mock is always available)
 *   - `MARKET_DATA_USE_DB_CACHE=1` is reserved for the Drizzle-backed
 *     cache swap-in (wired in a follow-up phase)
 *
 * Logger: the composition root accepts an optional `LoggerLike`. If
 * omitted, the internal `noopLogger` is used. To bridge
 * `@openbulls/logger`'s pino-based logger, pass an adapter that
 * implements `LoggerLike` (debug/info/warn/error with structured
 * meta). The package never imports `@openbulls/logger` directly to
 * keep its dependency surface minimal.
 */
import { ProviderName } from "../domain/brands";
import type { MarketDataError } from "../domain/errors";
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
import { KapAdapter } from "./adapter/kap.adapter";
import type { MarketDataAdapter } from "./adapter/market-data-adapter.port";
import { MockMarketDataAdapter } from "./adapter/mock-market-data.adapter";
import { SecEdgarAdapter } from "./adapter/sec-edgar.adapter";
import { TcmbAdapter } from "./adapter/tcmb.adapter";
import { TwelveDataAdapter } from "./adapter/twelvedata.adapter";
import { YahooFinanceAdapter } from "./adapter/yahoo-finance.adapter";
import {
  InMemoryCandleCache,
  InMemoryFinancialRatioCache,
  InMemoryFinancialStatementCache,
  InMemoryFxRateCache,
  InMemoryIndicatorCache,
  InMemoryNewsCache,
  InMemoryQuoteCache,
} from "./cache/in-memory-cache";
import { HttpClient } from "./http/http-client";
import type { LoggerLike } from "./log";
import { noopLogger } from "./log";
import type { MarketDataDeps, MarketDataServices } from "./market-data.types";
import { DEFAULT_RATE_LIMIT_POLICIES } from "./rate-limit/default-policies";
import { TokenBucketRateLimiter } from "./rate-limit/token-bucket";
import type { IRateLimiter, RateLimitPolicy } from "./rate-limit/token-bucket";
import { defaultPolicy } from "./router/policy";
import { DefaultProviderRouter } from "./router/provider-router";

/** Minimal env shape the composition root reads. */
export interface MarketDataEnv {
  readonly YAHOO_FINANCE_API_KEY?: string;
  readonly TWELVE_DATA_API_KEY?: string;
  readonly KAP_API_KEY?: string;
  readonly TCMB_API_KEY?: string;
  readonly MARKET_DATA_USE_DB_CACHE?: string;
  readonly MARKET_DATA_RATE_LIMIT_POLICIES?: ReadonlyArray<RateLimitPolicy>;
}

export interface CreateMarketDataServicesFromEnvInput {
  /** Reserved for the DB-backed cache swap-in. Currently unused. */
  readonly db?: unknown;
  readonly env: MarketDataEnv;
  readonly assetResolver?: IAssetResolver;
  readonly logger?: LoggerLike;
  readonly now?: () => Date;
}

export function createMarketDataServicesFromEnv(
  args: CreateMarketDataServicesFromEnvInput,
): MarketDataServices {
  const logger = args.logger ?? noopLogger;
  const now = args.now ?? (() => new Date());

  // ── Rate limiter ────────────────────────────────────────────────
  const policies = args.env.MARKET_DATA_RATE_LIMIT_POLICIES ?? DEFAULT_RATE_LIMIT_POLICIES;
  const limiter: IRateLimiter = new TokenBucketRateLimiter(policies);

  // ── HTTP clients per provider ───────────────────────────────────
  // Each provider owns its own HttpClient so rate-limit buckets are
  // not shared. (The limiter still differentiates by provider name.)
  const yahooHttp = new HttpClient(limiter, ProviderName("yahoo"), { logger });
  const twelvedataHttp = new HttpClient(limiter, ProviderName("twelvedata"), {
    logger,
  });
  const kapHttp = new HttpClient(limiter, ProviderName("kap"), { logger });
  const tcmbHttp = new HttpClient(limiter, ProviderName("tcmb"), { logger });
  const secHttp = new HttpClient(limiter, ProviderName("sec"), { logger });
  const mockHttp = new HttpClient(limiter, ProviderName("mock"), { logger });
  void mockHttp; // mock adapter doesn't actually hit the network

  // ── Adapters ────────────────────────────────────────────────────
  const adapters = new Map<ProviderName, MarketDataAdapter>();
  adapters.set(ProviderName("yahoo"), new YahooFinanceAdapter(yahooHttp, { logger }));
  adapters.set(
    ProviderName("tcmb"),
    new TcmbAdapter(tcmbHttp, {
      logger,
      ...(args.env.TCMB_API_KEY ? { apiKey: args.env.TCMB_API_KEY } : {}),
    }),
  );
  adapters.set(
    ProviderName("kap"),
    new KapAdapter(kapHttp, {
      logger,
      ...(args.env.KAP_API_KEY ? { apiKey: args.env.KAP_API_KEY } : {}),
    }),
  );
  adapters.set(ProviderName("sec"), new SecEdgarAdapter(secHttp, { logger }));
  if (args.env.TWELVE_DATA_API_KEY) {
    adapters.set(
      ProviderName("twelvedata"),
      new TwelveDataAdapter(twelvedataHttp, {
        apiKey: args.env.TWELVE_DATA_API_KEY,
        logger,
      }),
    );
  }
  adapters.set(ProviderName("mock"), new MockMarketDataAdapter());

  // ── Router ──────────────────────────────────────────────────────
  let resolveAsset:
    | ((
        sym: Parameters<IAssetResolver["lookup"]>[0],
      ) => Promise<{ exchange: string | null; assetType: string } | null>)
    | undefined;
  if (args.assetResolver) {
    const resolver = args.assetResolver;
    resolveAsset = async (sym) => {
      const meta = await resolver.lookup(sym);
      return meta ? { exchange: meta.exchange ?? null, assetType: meta.assetType } : null;
    };
  }
  const router: IProviderRouter = new DefaultProviderRouter({
    adapters,
    policy: defaultPolicy,
    ...(resolveAsset ? { resolveAsset } : {}),
    now,
    logger,
  });

  // ── Caches ──────────────────────────────────────────────────────
  const useDb = args.env.MARKET_DATA_USE_DB_CACHE === "1";
  if (useDb && !args.db) {
    throw new Error(
      "MARKET_DATA_USE_DB_CACHE=1 requires a `db` handle in createMarketDataServicesFromEnv",
    );
  }
  // In-memory caches are the default. DB-backed adapters will plug in
  // here once packages/db exposes the schema repository ports.
  const candleCache: ICandleCache = new InMemoryCandleCache();
  const quoteCache: IQuoteCache = new InMemoryQuoteCache();
  const fxCache: IFxRateCache = new InMemoryFxRateCache();
  const financialStatementCache: IFinancialStatementCache = new InMemoryFinancialStatementCache();
  const financialRatioCache: IFinancialRatioCache = new InMemoryFinancialRatioCache();
  const indicatorCache: IIndicatorCache = new InMemoryIndicatorCache();
  const newsCache: INewsCache = new InMemoryNewsCache();

  // ── Asset resolver fallback ─────────────────────────────────────
  const assetResolver: IAssetResolver = args.assetResolver ?? {
    lookup: async () => null,
  };

  // ── Bound service surface ───────────────────────────────────────
  const deps: MarketDataDeps = {
    candleCache,
    quoteCache,
    fxCache,
    financialStatementCache,
    financialRatioCache,
    indicatorCache,
    newsCache,
    assetResolver,
    router,
    now,
  };

  return {
    deps,
    getRouter: () => router,
    getCandles: (input) => getCandles(deps, input),
    getQuote: (input) => getQuote(deps, input),
    getFinancialStatements: (input) => getFinancialStatements(deps, input),
    getFinancialRatios: (input) => getFinancialRatios(deps, input),
    getFxRate: (input) => getFxRate(deps, input),
    getNews: (input) => getNews(deps, input),
    calculateRsi: (input) => calculateRsi({ ...deps }, input),
    calculateMacd: (input) => calculateMacd({ ...deps }, input),
    calculateSma: (input) => calculateSma({ ...deps }, input),
  };
}

// satisfy unused-import lint for the error type re-export
export type { MarketDataError };
