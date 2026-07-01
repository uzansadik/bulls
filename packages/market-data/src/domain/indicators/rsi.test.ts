/**
 * @openbulls/market-data — Wilder RSI golden vector test.
 *
 * RSI seeds Wilder's smoothing at index `period`. Slots < `period`
 * stay NaN. The numeric value at index `period` and onward must land
 * in a sensible band on a known uptrend.
 */
import { describe, expect, it } from "vitest";
import { calculateRSI } from "./rsi";

describe("calculateRSI (Wilder smoothing)", () => {
  it("returns an all-NaN series when input is shorter than period+1", () => {
    const out = calculateRSI([1, 2, 3], 14);
    expect(out.length).toBe(3);
    for (const v of out) expect(Number.isNaN(v)).toBe(true);
  });

  it("produces a finite value on a known uptrend", () => {
    const closes = [
      44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61,
      46.28, 46.28, 46.0, 46.03, 46.41, 46.22, 45.64, 46.21,
    ];
    const rsi = calculateRSI(closes, 14);
    expect(rsi.length).toBe(closes.length);
    const last = rsi[rsi.length - 1];
    expect(Number.isNaN(last ?? Number.NaN)).toBe(false);
    expect(Number.isFinite(last ?? Number.NaN)).toBe(true);
    expect(last ?? 0).toBeGreaterThan(40);
    expect(last ?? 0).toBeLessThan(90);
  });
});
