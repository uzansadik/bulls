/**
 * Domain unit: average-cost recompute.
 *
 * Verifies the rules documented in `cost-basis.ts`:
 *
 *   - `buy` updates `avgCost` (weighted average + fees).
 *   - `sell` reduces `quantity`, accumulates `realizedPnl`, leaves
 *     `avgCost` unchanged.
 *   - `dividend` adds `qty*price - fees` to `realizedPnl`.
 *   - `split` scales `quantity` and divides `avgCost` by ratio.
 *   - Oversell returns `InvalidTransactionError`.
 */
import { describe, expect, it } from "vitest";
import { TransactionSide } from "../brands";
import { InvalidTransactionError } from "../errors";
import { recomputeHolding } from "./cost-basis";
import { AssetSymbol } from "../symbol";
import { makeTx } from "@__tests__/fixtures";

describe("recomputeHolding — average-cost method", () => {
  it("updates avgCost on buy (weighted average with fees)", () => {
    const tx = [
      makeTx({ id: "1", side: "buy", quantity: "10", unitPrice: "100", fees: "5" }),
      makeTx({ id: "2", side: "buy", quantity: "10", unitPrice: "110", fees: "0" }),
    ];
    const r = recomputeHolding(tx, AssetSymbol("AAPL"));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // qty = 20
    // totalCost = 10*100+5 + 10*110 = 1005 + 1100 = 2105
    // avgCost = 2105 / 20 = 105.25
    expect(r.value.quantity).toBe("20.00000000");
    expect(r.value.avgCost).toBe("105.25000000");
    expect(r.value.realizedPnl).toBe("0.00000000");
  });

  it("accumulates realizedPnl on sell (proceeds - costOfSold)", () => {
    const tx = [
      makeTx({ id: "1", side: "buy", quantity: "10", unitPrice: "100", fees: "0" }),
      makeTx({ id: "2", side: "sell", quantity: "5", unitPrice: "120", fees: "0" }),
    ];
    const r = recomputeHolding(tx, AssetSymbol("AAPL"));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // costOfSold = 100 * 5 = 500
    // proceeds = 120 * 5 = 600
    // realized += 100
    expect(r.value.quantity).toBe("5.00000000");
    expect(r.value.avgCost).toBe("100.00000000");
    expect(r.value.realizedPnl).toBe("100.00000000");
  });

  it("adds dividend cash inflow to realizedPnl", () => {
    const tx = [
      makeTx({ id: "1", side: "buy", quantity: "10", unitPrice: "100", fees: "0" }),
      makeTx({ id: "2", side: "dividend", quantity: "10", unitPrice: "2", fees: "0" }),
    ];
    const r = recomputeHolding(tx, AssetSymbol("AAPL"));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.realizedPnl).toBe("20.00000000");
    expect(r.value.quantity).toBe("10.00000000");
  });

  it("applies split ratio (quantity *= ratio, avgCost /= ratio)", () => {
    const tx = [
      makeTx({ id: "1", side: "buy", quantity: "10", unitPrice: "100", fees: "0" }),
      makeTx({ id: "2", side: "split", quantity: "2", unitPrice: "0", fees: "0" }),
    ];
    const r = recomputeHolding(tx, AssetSymbol("AAPL"));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.quantity).toBe("20.00000000");
    expect(r.value.avgCost).toBe("50.00000000");
  });

  it("returns InvalidTransactionError on oversell", () => {
    const tx = [
      makeTx({ id: "1", side: "buy", quantity: "10", unitPrice: "100", fees: "0" }),
      makeTx({ id: "2", side: "sell", quantity: "20", unitPrice: "120", fees: "0" }),
    ];
    const r = recomputeHolding(tx, AssetSymbol("AAPL"));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBeInstanceOf(InvalidTransactionError);
    expect(r.error.code).toBe("portfolio/invalid-transaction");
    expect(r.error.kind).toBe("user");
    expect(r.error.data.side).toBe(TransactionSide("sell"));
  });
});