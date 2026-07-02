import type { Result } from "@openbulls/shared";
/**
 * @openbulls/market-data — provider router port.
 *
 * The router maps a `(symbol, capability)` request to an ordered
 * chain of provider adapters and walks the chain on failure. It is
 * the single seam where provider selection logic lives — application
 * queries depend on `IProviderRouter`, never on adapters directly.
 *
 * Implementation in `infrastructure/router/`. The router does NOT
 * own rate limiting (per-provider, inside `HttpClient`) or caching
 * (in the query layer).
 */
import type { AssetSymbol, ProviderName } from "../brands";
import type { MarketDataError } from "../errors";

/** Capability tags map 1:1 onto `MarketDataAdapter` methods. */
export type AdapterCapability =
  | "candles"
  | "quote"
  | "financial_statements"
  | "financial_ratios"
  | "fx"
  | "news";

export interface ProviderRoute {
  /** Ordered provider chain; the first entry is the primary. */
  readonly chain: readonly ProviderName[];
  /**
   * Call the next provider that supports `capability`, stopping at
   * fatal errors and returning the first successful result. The
   * input shape is provider-agnostic — the router dispatches to the
   * matching adapter method.
   */
  call<T>(capability: AdapterCapability, input: unknown): Promise<Result<T, MarketDataError>>;
}

export interface IProviderRouter {
  /**
   * Resolve a `(symbol, capability)` request to a chain + call
   * helper. The router inspects `symbol` (and `IAssetResolver`
   * metadata when available) to pick the chain.
   */
  resolve(symbol: AssetSymbol, capability: AdapterCapability): ProviderRoute;
}

/**
 * Pure function that returns an ordered provider chain for a given
 * request. Stateless and easy to unit-test; injected into
 * `DefaultProviderRouter` so applications can override the policy
 * without re-implementing the router.
 */
export type RouterPolicy = (input: RouterPolicyInput) => readonly ProviderName[];

export interface RouterPolicyInput {
  readonly symbol: AssetSymbol;
  readonly capability: AdapterCapability;
  /** Asset metadata when known. `null` when the symbol is not registered. */
  readonly asset: { readonly exchange: string | null; readonly assetType: string } | null;
  readonly now: Date;
}
