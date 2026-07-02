/**
 * @openbulls/market-data — `getFxRate` query.
 *
 * FX rates change on business days. Default TTL is 6 hours; routes
 * can override via `maxAgeMs`. Key is `${base}${quote}` (e.g.
 * `USDTRY`), not a tuple, to keep the cache simple.
 */
import { type Result, ok } from "@openbulls/shared";
import { AssetSymbol } from "../domain/brands";
import type { MarketDataError } from "../domain/errors";
import type { FxRate } from "../domain/fx-rate";
import type { IFxRateCache } from "../domain/ports/cache.port";
import type { IProviderRouter } from "../domain/ports/router.port";
import type { GetFxRateInput } from "../infrastructure/adapter/market-data-adapter.port";

export interface GetFxRateDeps {
  readonly fxCache: IFxRateCache;
  readonly router: IProviderRouter;
}

export interface GetFxRateQueryInput extends GetFxRateInput {
  /** Maximum cached age in milliseconds. Default 6 hours. */
  readonly maxAgeMs?: number;
}

export async function getFxRate(
  deps: GetFxRateDeps,
  input: GetFxRateQueryInput,
): Promise<Result<FxRate, MarketDataError>> {
  const maxAgeMs = input.maxAgeMs ?? 6 * 60 * 60 * 1000;

  const cached = await deps.fxCache.read({
    base: input.base,
    quote: input.quote,
    maxAgeMs,
  });
  if (!cached.ok) return cached;
  if (cached.value !== null) return ok(cached.value);

  const route = deps.router.resolve(AssetSymbol(`FX:${input.base}${input.quote}`), "fx");
  const result = await route.call<FxRate>("fx", input);
  if (!result.ok) return result;

  const writeResult = await deps.fxCache.write({ rate: result.value });
  if (!writeResult.ok) return ok(result.value);

  return ok(result.value);
}
