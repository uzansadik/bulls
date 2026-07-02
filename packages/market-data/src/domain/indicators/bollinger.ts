/**
 * Bollinger Bands — `middle = SMA(n)`, `upper = middle + k*stddev`,
 * `lower = middle - k*stddev`. Default `n=20`, `k=2`.
 *
 * `stddev` is the **population** standard deviation (divided by n,
 * not n-1), matching the convention used by TradingView and most
 * charting platforms.
 */
export interface BollingerBands {
  readonly middle: readonly number[];
  readonly upper: readonly number[];
  readonly lower: readonly number[];
}

export function calculateBollingerBands(
  closes: readonly number[],
  period = 20,
  multiplier = 2,
): BollingerBands {
  if (period < 1) {
    throw new Error(`bollinger period must be >= 1, got ${period}`);
  }
  if (multiplier <= 0) {
    throw new Error(`bollinger multiplier must be > 0, got ${multiplier}`);
  }

  const middle = new Array<number>(closes.length).fill(Number.NaN);
  const upper = new Array<number>(closes.length).fill(Number.NaN);
  const lower = new Array<number>(closes.length).fill(Number.NaN);

  if (closes.length < period) {
    return { middle, upper, lower };
  }

  for (let i = period - 1; i < closes.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += closes[j] ?? 0;
    const mean = sum / period;

    let sq = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const d = (closes[j] ?? 0) - mean;
      sq += d * d;
    }
    const stdev = Math.sqrt(sq / period);

    middle[i] = mean;
    upper[i] = mean + multiplier * stdev;
    lower[i] = mean - multiplier * stdev;
  }
  return { middle, upper, lower };
}
