/**
 * @openbulls/portfolio — performance calculators (pure).
 *
 * Three metrics, all computed from a `(from, to, baseCurrency)`
 * window and a transaction + holding snapshot. No I/O; the
 * application query gathers the inputs and calls these helpers.
 *
 * `calculateTotalReturn`:
 *   Trivial money-weighted return.
 *     TR = (endValue - invested) / invested
 *   Where `invested` is the sum of buy + transfer_in +
 *   split-adjusted initial cost — see the application query
 *   for the exact accumulation rule.
 *
 * `calculateTimeWeightedReturn` (Modified Dietz):
 *   Cashflow-aware TWR approximation that assumes a single
 *   sub-period weighted by cashflow timing:
 *     TWR = (EMV - BMV - Σ CF_i) / (BMV + Σ (CF_i · w_i))
 *     where w_i = (T - t_i) / T  and t_i ∈ [from, to]
 *
 *   Weights are based on `executedAt` fractions of the window
 *   length. BMV/EMV are caller-supplied market values in
 *   baseCurrency. Empty cashflows ⇒ standard Dietz reduces
 *   to `(EMV - BMV) / BMV`.
 *
 * `calculateMaxDrawdown`:
 *   Maximum peak-to-trough decline over a series of equity
 *   points, returned as a non-positive fraction (-1 = -100%).
 *   Window identifies when the deepest drawdown occurred.
 */
import { type Money } from "../brands";
import type { Cashflow, EquityPoint } from "../pnl";

export function calculateTotalReturn(
  startValue: Money,
  endValue: Money,
  invested: Money,
): number {
  const i = Number(invested);
  if (i === 0) return 0;
  return (Number(endValue) - Number(startValue)) / i;
}

export interface MaxDrawdownResult {
  readonly drawdown: number;
  readonly peak: Date | null;
  readonly trough: Date | null;
}

export function calculateMaxDrawdown(
  equityCurve: readonly EquityPoint[],
): MaxDrawdownResult {
  if (equityCurve.length === 0) {
    return { drawdown: 0, peak: null, trough: null };
  }
  let peakValue = Number(equityCurve[0]?.value ?? 0);
  let peakAt = equityCurve[0]?.asOf ?? null;
  let bestDrawdown = 0;
  let bestPeak: Date | null = null;
  let bestTrough: Date | null = null;

  for (const point of equityCurve) {
    const v = Number(point.value);
    if (v > peakValue) {
      peakValue = v;
      peakAt = point.asOf;
    }
    if (peakValue > 0) {
      const dd = (v - peakValue) / peakValue;
      if (dd < bestDrawdown) {
        bestDrawdown = dd;
        bestPeak = peakAt;
        bestTrough = point.asOf;
      }
    }
  }
  return { drawdown: bestDrawdown, peak: bestPeak, trough: bestTrough };
}

export function calculateTimeWeightedReturn(
  bmv: Money,
  emv: Money,
  cashflows: readonly Cashflow[],
  from: Date,
  to: Date,
): number {
  const beginMV = Number(bmv);
  const endMV = Number(emv);
  const totalT = to.getTime() - from.getTime();
  if (totalT <= 0) {
    // Degenerate window: behave like simple Dietz.
    if (beginMV === 0) return 0;
    return (endMV - beginMV) / beginMV;
  }
  let netCashflow = 0;
  let weighted = 0;
  for (const cf of cashflows) {
    const t = cf.at.getTime();
    if (t < from.getTime() || t > to.getTime()) continue;
    const amount = Number(cf.amount);
    const w = (to.getTime() - t) / totalT;
    netCashflow += amount;
    weighted += amount * w;
  }
  const denom = beginMV + weighted;
  if (denom === 0) return 0;
  return (endMV - beginMV - netCashflow) / denom;
}