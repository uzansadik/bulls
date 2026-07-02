/**
 * MACD (Moving Average Convergence Divergence) — three lines:
 *
 *   macdLine   = EMA(closes, fastPeriod) - EMA(closes, slowPeriod)
 *   signalLine = EMA(macdLine, signalPeriod)
 *   histogram  = macdLine - signalLine
 *
 * Defaults are the standard 12/26/9. All three arrays are aligned to
 * `closes`; leading slots are `NaN` until each line has enough input
 * to warm up.
 */
export interface MacdOutput {
  readonly macd: readonly number[];
  readonly signal: readonly number[];
  readonly histogram: readonly number[];
}

export function calculateMACD(
  closes: readonly number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MacdOutput {
  if (fastPeriod < 1 || slowPeriod < 1 || signalPeriod < 1) {
    throw new Error(
      `macd periods must be >= 1, got fast=${fastPeriod} slow=${slowPeriod} signal=${signalPeriod}`,
    );
  }
  if (fastPeriod >= slowPeriod) {
    throw new Error(`macd fastPeriod (${fastPeriod}) must be < slowPeriod (${slowPeriod})`);
  }
  const emaFast = calculateEMA(closes, fastPeriod);
  const emaSlow = calculateEMA(closes, slowPeriod);

  const macd = new Array<number>(closes.length).fill(Number.NaN);
  for (let i = 0; i < closes.length; i++) {
    const a = emaFast[i];
    const b = emaSlow[i];
    if (a !== undefined && b !== undefined && !Number.isNaN(a) && !Number.isNaN(b)) {
      macd[i] = a - b;
    }
  }

  // Signal line is EMA of the MACD line, computed only over the
  // defined portion so the seed lands on the first valid MACD value.
  const definedMacd = macd.filter((v) => !Number.isNaN(v));
  const signalInner = calculateEMA(definedMacd, signalPeriod);
  const signal = new Array<number>(closes.length).fill(Number.NaN);
  let writeIdx = 0;
  for (let i = 0; i < macd.length; i++) {
    if (!Number.isNaN(macd[i] ?? Number.NaN)) {
      signal[i] = signalInner[writeIdx] ?? Number.NaN;
      writeIdx++;
    }
  }

  const histogram = new Array<number>(closes.length).fill(Number.NaN);
  for (let i = 0; i < closes.length; i++) {
    const m = macd[i];
    const s = signal[i];
    if (m !== undefined && s !== undefined && !Number.isNaN(m) && !Number.isNaN(s)) {
      histogram[i] = m - s;
    }
  }

  return { macd, signal, histogram };
}

// Self-import via the file's own export — kept inline to avoid a
// module-resolution cycle through `index.ts`.
import { calculateEMA } from "./ema";
