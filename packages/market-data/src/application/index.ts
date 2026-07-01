/**
 * @openbulls/market-data — application query barrel.
 *
 * Re-exports every query (bound service surface) so the composition
 * root and downstream packages can import from a single entry point.
 */
export { getCandles } from "./get-candles.query";
export type { GetCandlesDeps } from "./get-candles.query";

export { getQuote } from "./get-quote.query";
export type { GetQuoteDeps, GetQuoteQueryInput } from "./get-quote.query";

export { getFinancialStatements } from "./get-financial-statements.query";
export type { GetFinancialStatementsDeps } from "./get-financial-statements.query";

export { getFinancialRatios } from "./get-financial-ratios.query";
export type { GetFinancialRatiosDeps } from "./get-financial-ratios.query";

export { getFxRate } from "./get-fx-rate.query";
export type { GetFxRateDeps, GetFxRateQueryInput } from "./get-fx-rate.query";

export { getNews } from "./get-news.query";
export type { GetNewsDeps } from "./get-news.query";

export { calculateRsi } from "./calculate-rsi.query";
export type { CalculateRsiDeps, CalculateRsiInput } from "./calculate-rsi.query";

export { calculateMacd } from "./calculate-macd.query";
export type { CalculateMacdDeps, CalculateMacdInput } from "./calculate-macd.query";

export { calculateSma } from "./calculate-sma.query";
export type { CalculateSmaDeps, CalculateSmaInput } from "./calculate-sma.query";
