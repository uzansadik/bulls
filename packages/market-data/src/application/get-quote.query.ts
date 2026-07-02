/**
 * @openbulls/market-data — `getQuote` query.
 *
 * Latest-snapshot cache keyed by symbol. TTL is caller-supplied via
 * `maxAgeMs` so different routes (live ticker vs. dashboard refresh)
 * can pick their own freshness policy. Asset metadata lookup is
 * optional — when the router doesn't need it, this query still works.
 */
import { type Result, ok } from "@openbulls/shared";
import type { MarketDataError } from "../domain/errors";
import type { IQuoteCache } from "../domain/ports/cache.port";
import type { IProviderRouter } from "../domain/ports/router.port";
import type { Quote } from "../domain/quote";
import type { GetQuoteInput } from "../infrastructure/adapter/market-data-adapter.port";

export interface GetQuoteDeps {
  readonly quoteCache: IQuoteCache;
  readonly router: IProviderRouter;
}

export interface GetQuoteQueryInput extends GetQuoteInput {
  /** Maximum cached age in milliseconds. Default 60_000 (60s). */
  readonly maxAgeMs?: number;
}

export async function getQuote(
  deps: GetQuoteDeps,
  input: GetQuoteQueryInput,
): Promise<Result<Quote, MarketDataError>> {
  const maxAgeMs = input.maxAgeMs ?? 60_000;

  const cached = await deps.quoteCache.read({
    symbol: input.symbol,
    maxAgeMs,
  });
  if (!cached.ok) return cached;
  if (cached.value !== null) return ok(cached.value);

  const route = deps.router.resolve(input.symbol, "quote");
  const result = await route.call<Quote>("quote", input);
  if (!result.ok) return result;

  const writeResult = await deps.quoteCache.write({ quote: result.value });
  if (!writeResult.ok) return ok(result.value);

  return ok(result.value);
}
