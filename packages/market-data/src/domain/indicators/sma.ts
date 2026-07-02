/**
 * SMA (Simple Moving Average) — arithmetic mean of the trailing
 * `period` closes. Slots before `period` closes are available are
 * `NaN`; from `period-1` onward the value is the arithmetic mean of
 * the last `period` closes.
 */
export function calculateSMA(closes: readonly number[], period: number): readonly number[] {
  if (period < 1) {
    throw new Error(`sma period must be >= 1, got ${period}`);
  }
  const result = new Array<number>(closes.length).fill(Number.NaN);
  if (closes.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += closes[i] ?? 0;
  result[period - 1] = sum / period;

  for (let i = period; i < closes.length; i++) {
    sum += (closes[i] ?? 0) - (closes[i - period] ?? 0);
    result[i] = sum / period;
  }
  return result;
}
