/**
 * @openbulls/market-data — asset resolution port.
 *
 * Given a free-form `AssetSymbol` ("AAPL", "THYAO.IS", "USDTRY"),
 * returns the canonical asset metadata from `market_assets`. The
 * provider router uses this to pick a primary/fallback chain
 * (e.g. `exchange === "BIST"` ⇒ KAP primary).
 *
 * Implementation wraps `IMarketAssetRepository` from
 * `@openbulls/db` and lives in `infrastructure/asset-resolver/`.
 */
import type { MarketAsset } from "@openbulls/db/schema";
import type { AssetSymbol } from "../brands";

export interface IAssetResolver {
  /**
   * Resolve a symbol to its asset metadata. Returns `null` when the
   * symbol is not registered in `market_assets` — callers can then
   * apply a heuristic (e.g. ".IS" suffix ⇒ BIST).
   */
  lookup(symbol: AssetSymbol): Promise<MarketAsset | null>;
}
