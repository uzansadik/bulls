/**
 * @openbulls/market-data — `getNews` query.
 *
 * News cache is a flat list filtered at read time by `from/to/symbol`.
 * No TTL — news writes append; the application layer is responsible
 * for trimming old entries (out of scope for Faz 1).
 */
import { type Result, ok } from "@openbulls/shared";
import { AssetSymbol } from "../domain/brands";
import type { MarketDataError } from "../domain/errors";
import type { NewsItem } from "../domain/news";
import type { INewsCache } from "../domain/ports/cache.port";
import type { IProviderRouter } from "../domain/ports/router.port";
import type { GetNewsInput } from "../infrastructure/adapter/market-data-adapter.port";

export interface GetNewsDeps {
  readonly newsCache: INewsCache;
  readonly router: IProviderRouter;
}

export async function getNews(
  deps: GetNewsDeps,
  input: GetNewsInput,
): Promise<Result<NewsItem[], MarketDataError>> {
  const symbolKey = input.symbol ?? null;

  const cached = await deps.newsCache.read({
    symbol: symbolKey,
    from: input.from,
    to: input.to,
  });
  if (!cached.ok) return cached;
  if (cached.value.length > 0) return cached;

  const route = deps.router.resolve(input.symbol ?? AssetSymbol("GLOBAL"), "news");
  const result = await route.call<NewsItem[]>("news", input);
  if (!result.ok) return result;

  const writeResult = await deps.newsCache.write({ items: result.value });
  if (!writeResult.ok) return ok(result.value);

  return ok(result.value);
}
