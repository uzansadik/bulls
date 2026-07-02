/**
 * Barrel for indicator helpers.
 *
 * Indicators are pure: they take numeric inputs (close prices) and
 * return numeric outputs. They are NOT coupled to `Candle`/`Indicator`
 * VO types — the application query layer wires the two together.
 *
 *   calculateRSI(closes)            → readonly number[]
 *   calculateSMA(closes, n)         → readonly number[]
 *   calculateEMA(closes, n)         → readonly number[]
 *   calculateMACD(closes, ...)      → { macd, signal, histogram }
 *   calculateBollingerBands(...)    → { middle, upper, lower }
 *
 * All functions are deterministic and have no side effects, so
 * they are trivial to unit test with golden vectors.
 */
export { calculateRSI } from "./rsi";
export { calculateSMA } from "./sma";
export { calculateEMA } from "./ema";
export { calculateMACD } from "./macd";
export type { MacdOutput } from "./macd";
export { calculateBollingerBands } from "./bollinger";
export type { BollingerBands } from "./bollinger";
