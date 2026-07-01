/**
 * @openbulls/market-data — provider router + fallback chain.
 *
 * Walks a `(symbol, capability)` lookup through an ordered chain of
 * provider adapters. The chain is determined by `RouterPolicy`
 * (default: `defaultPolicy`).
 *
 * Fatal errors (`InvalidRequestError`, `SymbolNotFoundError`,
 * `UnsupportedCapabilityError`) stop the chain immediately —
 * surfacing the error to the caller. Retryable errors (5xx,
 * network, timeout, parse) cause the router to fall through to the
 * next provider.
 *
 * Why split fatal vs. retryable here: a "symbol not found" from
 * Yahoo doesn't help by retrying on Twelve Data — the symbol just
 * isn't recognized anywhere upstream. But a 5xx means the provider
 * is unhealthy; the next provider might succeed.
 */
import { type Result, err } from "@openbulls/shared";
import type { AssetSymbol, ProviderName } from "../../domain/brands";
import type { MarketDataError } from "../../domain/errors";
import { isFatal } from "../../domain/errors";
import type {
  AdapterCapability,
  IProviderRouter,
  ProviderRoute,
  RouterPolicy,
} from "../../domain/ports/router.port";
import type { MarketDataAdapter } from "../adapter/market-data-adapter.port";
import type { LoggerLike } from "../log";
import { noopLogger } from "../log";

interface DefaultProviderRouterOptions {
  readonly adapters: ReadonlyMap<ProviderName, MarketDataAdapter>;
  readonly policy: RouterPolicy;
  readonly resolveAsset?: (symbol: AssetSymbol) => Promise<{
    readonly exchange: string | null;
    readonly assetType: string;
  } | null>;
  readonly now?: () => Date;
  readonly logger?: LoggerLike;
}

export class DefaultProviderRouter implements IProviderRouter {
  private readonly adapters: ReadonlyMap<ProviderName, MarketDataAdapter>;
  private readonly policy: RouterPolicy;
  private readonly resolveAsset:
    | ((symbol: AssetSymbol) => Promise<{
        readonly exchange: string | null;
        readonly assetType: string;
      } | null>)
    | undefined;
  private readonly now: () => Date;
  private readonly logger: LoggerLike;

  constructor(options: DefaultProviderRouterOptions) {
    this.adapters = options.adapters;
    this.policy = options.policy;
    this.resolveAsset = options.resolveAsset;
    this.now = options.now ?? (() => new Date());
    this.logger = options.logger ?? noopLogger;
  }

  resolve(symbol: AssetSymbol, capability: AdapterCapability): ProviderRoute {
    const adapters = this.adapters;
    const policy = this.policy;
    const resolveAsset = this.resolveAsset;
    const now = this.now;
    const logger = this.logger;
    void capability; // included for callers that want to pre-resolve a chain

    return {
      chain: [], // populated below on first call
      async call<T>(cap: AdapterCapability, input: unknown): Promise<Result<T, MarketDataError>> {
        const asset = resolveAsset ? await resolveAsset(symbol) : null;
        const chain = policy({
          symbol,
          capability: cap,
          asset: asset ? { exchange: asset.exchange, assetType: asset.assetType } : null,
          now: now(),
        });

        let lastResult: Result<T, MarketDataError> | null = null;
        for (const provider of chain) {
          const adapter = adapters.get(provider);
          if (!adapter) {
            logger.warn("router.missing_adapter", { provider });
            continue;
          }
          if (!adapter.capabilities.has(cap)) {
            logger.debug("router.skip_unsupported", { provider, cap });
            continue;
          }
          const r = (await dispatch(adapter, cap, input)) as Result<T, MarketDataError>;
          if (r.ok) return r;
          lastResult = r;
          if (isFatal(r.error)) {
            logger.debug("router.fatal_stop", {
              provider,
              cap,
              code: r.error.code,
            });
            return r;
          }
          logger.debug("router.fallthrough", {
            provider,
            cap,
            code: r.error.code,
          });
        }

        if (lastResult) return lastResult;
        return err({
          ...baseFallbackError(),
        } as unknown as MarketDataError);
      },
    };
  }
}

/** Dispatch to the matching adapter method based on capability. */
async function dispatch(
  adapter: MarketDataAdapter,
  capability: AdapterCapability,
  input: unknown,
): Promise<Result<unknown, MarketDataError>> {
  switch (capability) {
    case "candles":
      return adapter.getCandles(input as Parameters<typeof adapter.getCandles>[0]);
    case "quote":
      return adapter.getQuote(input as Parameters<typeof adapter.getQuote>[0]);
    case "financial_statements":
      return adapter.getFinancialStatements(
        input as Parameters<typeof adapter.getFinancialStatements>[0],
      );
    case "financial_ratios":
      return adapter.getFinancialRatios(input as Parameters<typeof adapter.getFinancialRatios>[0]);
    case "fx":
      return adapter.getFxRate(input as Parameters<typeof adapter.getFxRate>[0]);
    case "news":
      return adapter.getNews(input as Parameters<typeof adapter.getNews>[0]);
  }
}

function baseFallbackError(): MarketDataError {
  // Sentinel error when the chain is empty or every adapter missing.
  // Kept as a function so we don't import the entire error class
  // hierarchy here.
  return {
    code: "market-data/router-empty",
    name: "RouterEmptyChainError",
    message: "No provider in the chain supports this capability",
  } as unknown as MarketDataError;
}
