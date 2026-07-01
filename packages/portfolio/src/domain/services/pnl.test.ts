/**
 * Domain unit: realized & unrealized PnL calculators.
 *
 * `calculateUnrealizedPnl(quantity, avgCost, marketPrice)` returns
 *   qty * (marketPrice - avgCost)
 *
 * `calculateRealizedPnl(transactions)` re-derives realized from the
 * log so it must agree with `recomputeHolding`.
 */
import { describe, expect, it } from "vitest";
import { Money } from "../brands";
import { AssetSymbol } from "../symbol";
import { calculateUnrealizedPnl, calculateRealizedPnl } from "./pnl";
import { makeTx } from "@__tests__/fixtures";

describe("calculateUnrealizedPnl", () => {
  it("returns positive pnl when marketPrice > avgCost", () => {
    const out = calculateUnrealizedPnl(Money("10"), Money("100"), Money("120"));
    expect(out).toBe(Money("200.00000000"));
  });

  it("returns negative pnl when marketPrice < avgCost", () => {
    const out = calculateUnrealizedPnl(Money("10"), Money("100"), Money("80"));
    expect(out).toBe(Money("-200.00000000"));
  });

  it("returns zero when marketPrice == avgCost", () => {
    const out = calculateUnrealizedPnl(Money("10"), Money("100"), Money("100"));
    expect(out).toBe(Money("0.00000000"));
  });
});

describe("calculateRealizedPnl", () => {
  it("matches recomputeHolding for buy+sell logs", () => {
    const tx = [
      makeTx({ id: "1", side: "buy", quantity: "10", unitPrice: "100", fees: "0" }),
      makeTx({ id: "2", side: "sell", quantity: "4", unitPrice: "130", fees: "0" }),
    ];
    const out = calculateRealizedPnl(tx, AssetSymbol("AAPL"));
    // (130 - 100) * 4 = 120
    expect(out).toBe(Money("120.00000000"));
  });
});