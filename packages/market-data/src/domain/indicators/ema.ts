/**
 * EMA (Exponential Moving Average) — recursive, with SMA seed.
 *
 *   k = 2 / (period + 1)
 *   seed = SMA(period)  (over the first `period` closes)
 *   EMA[i] = close[i] * k + EMA[i-1] * (1 - k)
 */
export function calculateEMA(closes: readonly number[], period: number): readonly number[] {
  if (period < 1) {
    throw new Error(`ema period must be >= 1, got ${period}`);
  }
  const result = new Array<number>(closes.length).fill(Number.NaN);
  if (closes.length < period) return result;

  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += closes[i] ?? 0;
  result[period - 1] = sum / period;

  for (let i = period; i < closes.length; i++) {
    result[i] = (closes[i] ?? 0) * k + (result[i - 1] ?? 0) * (1 - k);
  }
  return result;
}
