/**
 * @openbulls/market-data — `getCandles` query.
 *
 * Cache-first: read `(symbol, interval)` bucket filtered by `[from,to]`,
 * fall through to the provider router on miss. On success, write the
 * returned candles back to the cache (write-through).
 */
import { type Result, ok } from "@openbulls/shared";
import { ProviderName } from "../domain/brands";
import type { Candle } from "../domain/candle";
import type { MarketDataError } from "../domain/errors";
import type { ICandleCache } from "../domain/ports/cache.port";
import type { IProviderRouter } from "../domain/ports/router.port";
import type { GetCandlesInput } from "../infrastructure/adapter/market-data-adapter.port";

export interface GetCandlesDeps {
  readonly candleCache: ICandleCache;
  readonly router: IProviderRouter;
}

export async function getCandles(
  deps: GetCandlesDeps,
  input: GetCandlesInput,
): Promise<Result<Candle[], MarketDataError>> {
  const cached = await deps.candleCache.read({
    symbol: input.symbol,
    interval: input.interval,
    from: input.from,
    to: input.to,
  });
  if (!cached.ok) return cached;
  if (cached.value.length > 0) return cached;

  const route = deps.router.resolve(input.symbol, "candles");
  const result = await route.call<Candle[]>("candles", input);
  if (!result.ok) return result;

  // route.chain[0] is the primary provider; on success the router stops at
  // the first adapter that returned OK. Use that as the cache audit key.
  const provider = route.chain[0] ?? ProviderName("yahoo");
  const writeResult = await deps.candleCache.write({
    symbol: input.symbol,
    interval: input.interval,
    candles: result.value,
    provider,
  });
  // Cache write failures are non-fatal — return the live data anyway.
  if (!writeResult.ok) return ok(result.value);

  return ok(result.value);
}
