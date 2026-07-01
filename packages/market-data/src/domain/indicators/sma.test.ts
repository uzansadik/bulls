/**
 * @openbulls/market-data — SMA correctness test.
 *
 * SMA seeds its rolling window at index `period - 1`. Earlier slots
 * are filled with NaN. Each value at index `i >= period - 1` is the
 * arithmetic mean of closes[i - period + 1 .. i].
 */
import { describe, expect, it } from "vitest";
import { calculateSMA } from "./sma";

describe("calculateSMA", () => {
  it("leads with NaN slots when the input is shorter than the period", () => {
    expect(calculateSMA([1, 2], 3)).toEqual([Number.NaN, Number.NaN]);
  });

  it("computes the trailing rolling mean starting at index period-1", () => {
    const out = calculateSMA([1, 2, 3, 4, 5], 3);
    expect(out.length).toBe(5);
    expect(Number.isNaN(out[0])).toBe(true);
    expect(Number.isNaN(out[1])).toBe(true);
    expect(out[2]).toBe(2);
    expect(out[3]).toBe(3);
    expect(out[4]).toBe(4);
  });

  it("emits exactly one finite value when period equals input length", () => {
    const out = calculateSMA([2, 4, 6], 3);
    expect(out.length).toBe(3);
    expect(out[2]).toBe(4);
  });
});
