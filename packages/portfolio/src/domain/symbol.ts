/**
 * @openbulls/portfolio — AssetSymbol brand.
 *
 * Mirrors `@openbulls/market-data`'s `AssetSymbol`. Kept as a
 * separate brand so the portfolio domain does not depend on
 * `@openbulls/market-data`; the composition root bridges both.
 */
import type { Brand } from "@openbulls/shared";

export type AssetSymbol = Brand<string, "AssetSymbol">;
export const AssetSymbol = (s: string): AssetSymbol => s as AssetSymbol;