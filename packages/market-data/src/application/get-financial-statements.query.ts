/**
 * @openbulls/market-data — `getFinancialStatements` query.
 *
 * Cache-keyed by `(symbol, period)`; writes are batched (a single
 * write may contain multiple statements of different types).
 */
import { type Result, ok } from "@openbulls/shared";
import type { MarketDataError } from "../domain/errors";
import type { FinancialStatement } from "../domain/financial-statement";
import type { IFinancialStatementCache } from "../domain/ports/cache.port";
import type { IProviderRouter } from "../domain/ports/router.port";
import type { GetFinancialStatementsInput } from "../infrastructure/adapter/market-data-adapter.port";

export interface GetFinancialStatementsDeps {
  readonly financialStatementCache: IFinancialStatementCache;
  readonly router: IProviderRouter;
}

export async function getFinancialStatements(
  deps: GetFinancialStatementsDeps,
  input: GetFinancialStatementsInput,
): Promise<Result<FinancialStatement[], MarketDataError>> {
  const limit = input.limit ?? 8;

  const cached = await deps.financialStatementCache.read({
    symbol: input.symbol,
    period: input.period,
    limit,
  });
  if (!cached.ok) return cached;
  if (cached.value.length > 0) return cached;

  const route = deps.router.resolve(input.symbol, "financial_statements");
  const result = await route.call<FinancialStatement[]>("financial_statements", input);
  if (!result.ok) return result;

  const writeResult = await deps.financialStatementCache.write({
    statements: result.value,
  });
  if (!writeResult.ok) return ok(result.value);

  return ok(result.value);
}
