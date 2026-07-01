/**
 * RSI (Relative Strength Index) — Wilder's smoothing method.
 *
 * Returns one RSI value per input candle, indexed the same way as
 * `closes`. The first `period` slots are `NaN` because the algorithm
 * needs `period` deltas before it can emit the first value.
 *
 * The caller (calculate-rsi.query) decides whether to drop the
 * leading NaNs, interpolate them, or surface them in the UI.
 *
 *   close:  [44, 44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42]
 *   period: 14
 *   rsi:    [NaN, NaN, ..., NaN, 70.46, ...]
 */
export function calculateRSI(closes: readonly number[], period = 14): readonly number[] {
  if (period < 1) {
    throw new Error(`rsi period must be >= 1, got ${period}`);
  }
  if (closes.length <= period) {
    return closes.map(() => Number.NaN);
  }

  const result = new Array<number>(closes.length).fill(Number.NaN);
  let avgGain = 0;
  let avgLoss = 0;

  // Seed: simple average of first `period` deltas.
  for (let i = 1; i <= period; i++) {
    const diff = (closes[i] ?? 0) - (closes[i - 1] ?? 0);
    if (diff > 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;
  result[period] = computeRsi(avgGain, avgLoss);

  // Subsequent: Wilder smoothing.
  for (let i = period + 1; i < closes.length; i++) {
    const diff = (closes[i] ?? 0) - (closes[i - 1] ?? 0);
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = computeRsi(avgGain, avgLoss);
  }

  return result;
}

function computeRsi(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}
