/**
 * Domain unit: performance calculators.
 *
 *   - TotalReturn: simple (end - start) / invested
 *   - TimeWeightedReturn: Modified Dietz with cashflow weighting
 *   - MaxDrawdown: peak-to-trough decline on equity curve
 */
import { describe, expect, it } from "vitest";
import { Currency, Money } from "../brands";
import type { Cashflow, EquityPoint } from "../pnl";
import {
  calculateMaxDrawdown,
  calculateTimeWeightedReturn,
  calculateTotalReturn,
} from "./performance";

describe("calculateTotalReturn", () => {
  it("returns 0 when nothing was invested", () => {
    const out = calculateTotalReturn(Money("0"), Money("100"), Money("0"));
    expect(out).toBe(0);
  });

  it("returns end/start when start == invested", () => {
    const out = calculateTotalReturn(Money("100"), Money("120"), Money("100"));
    expect(out).toBe(0.2);
  });
});

describe("calculateTimeWeightedReturn (Modified Dietz)", () => {
  const from = new Date("2026-01-01T00:00:00Z");
  const to = new Date("2026-07-01T00:00:00Z");
  const ccy = Currency("TRY");

  it("simple (EMV - BMV)/BMV when no cashflows", () => {
    const out = calculateTimeWeightedReturn(
      Money("100"),
      Money("120"),
      [],
      from,
      to,
    );
    expect(out).toBeCloseTo(0.2, 8);
  });

  it("weights cashflow by (T - t_i) / T (single mid-window flow)", () => {
    const mid = new Date("2026-04-01T00:00:00Z");
    const cf: Cashflow[] = [{ at: mid, amount: Money("50"), currency: ccy }];
    // from 2026-01-01, to 2026-07-01, mid 2026-04-01.
    // T = (to - from) ms, t = mid ms. w = (T - t) / T = 91/181.
    const totalT = to.getTime() - from.getTime();
    const w = (to.getTime() - mid.getTime()) / totalT;
    // TWR = (170 - 100 - 50) / (100 + 50*w) = 20 / (100 + 50*91/181)
    const expected = 20 / (100 + 50 * w);
    const out = calculateTimeWeightedReturn(Money("100"), Money("170"), cf, from, to);
    expect(out).toBeCloseTo(expected, 8);
  });
});

describe("calculateMaxDrawdown", () => {
  it("returns 0 for empty series", () => {
    const out = calculateMaxDrawdown([]);
    expect(out.drawdown).toBe(0);
    expect(out.peak).toBeNull();
    expect(out.trough).toBeNull();
  });

  it("detects the deepest peak-to-trough drop", () => {
    const ccy = Currency("USD");
    const series: EquityPoint[] = [
      { asOf: new Date("2026-01-01"), value: Money("100"), currency: ccy },
      { asOf: new Date("2026-02-01"), value: Money("120"), currency: ccy },
      { asOf: new Date("2026-03-01"), value: Money("90"), currency: ccy },
      { asOf: new Date("2026-04-01"), value: Money("110"), currency: ccy },
    ];
    // peak=120, trough=90 → dd = (90-120)/120 = -0.25
    const out = calculateMaxDrawdown(series);
    expect(out.drawdown).toBeCloseTo(-0.25, 8);
    expect(out.peak?.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(out.trough?.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });
});