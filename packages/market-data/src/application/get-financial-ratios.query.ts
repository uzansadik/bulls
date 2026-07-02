/**
 * @openbulls/market-data — `getFinancialRatios` query.
 *
 * Mirrors `getFinancialStatements` but for derived ratios (P/E,
 * ROE, debt/equity, ...). Cache-keyed by `(symbol, period)`.
 */
import { type Result, ok } from "@openbulls/shared";
import type { MarketDataError } from "../domain/errors";
import type { FinancialRatio } from "../domain/financial-ratio";
import type { IFinancialRatioCache } from "../domain/ports/cache.port";
import type { IProviderRouter } from "../domain/ports/router.port";
import type { GetFinancialRatiosInput } from "../infrastructure/adapter/market-data-adapter.port";

export interface GetFinancialRatiosDeps {
  readonly financialRatioCache: IFinancialRatioCache;
  readonly router: IProviderRouter;
}

export async function getFinancialRatios(
  deps: GetFinancialRatiosDeps,
  input: GetFinancialRatiosInput,
): Promise<Result<FinancialRatio[], MarketDataError>> {
  const limit = input.limit ?? 8;

  const cached = await deps.financialRatioCache.read({
    symbol: input.symbol,
    period: input.period,
    limit,
  });
  if (!cached.ok) return cached;
  if (cached.value.length > 0) return cached;

  const route = deps.router.resolve(input.symbol, "financial_ratios");
  const result = await route.call<FinancialRatio[]>("financial_ratios", input);
  if (!result.ok) return result;

  const writeResult = await deps.financialRatioCache.write({
    ratios: result.value,
  });
  if (!writeResult.ok) return ok(result.value);

  return ok(result.value);
}
