/**
 * Domain unit: FX adjustment helper.
 *
 * Covers three branches of `convert`:
 *
 *   - same currency → identity (returns amount unchanged)
 *   - direct rate → multiply
 *   - cross-pair via anchor currency (e.g. EUR→TRY, USD→TRY → EUR→USD)
 */
import { describe, expect, it } from "vitest";
import { Currency, Money } from "../brands";
import { FxRateMap, convert } from "./fx-adjust";

const at = new Date("2026-01-01T00:00:00Z");

function rate(base: string, quote: string, r: number) {
  return {
    base: Currency(base),
    quote: Currency(quote),
    rate: r,
    asOf: at,
    provider: "test",
  };
}

describe("convert (fx-adjust)", () => {
  it("returns the amount unchanged for identity (X→X)", () => {
    const map = new FxRateMap();
    const out = convert(Money("100"), Currency("USD"), Currency("USD"), map);
    expect(out).toBe(Money("100"));
  });

  it("uses the direct rate when available", () => {
    const map = new FxRateMap();
    map.setRate(rate("USD", "TRY", 35));
    const out = convert(Money("100"), Currency("USD"), Currency("TRY"), map);
    expect(out).toBe(Money("3500.00000000"));
  });

  it("derives a cross rate via an anchor currency (EUR→USD through TRY)", () => {
    const map = new FxRateMap();
    map.setRate(rate("EUR", "TRY", 36));
    map.setRate(rate("USD", "TRY", 35));
    // EUR→USD = (EUR→TRY) / (USD→TRY) = 36 / 35 ≈ 1.02857143
    // Convert 100 EUR → 100 * (36/35) ≈ 102.85714286
    const out = convert(Money("100"), Currency("EUR"), Currency("USD"), map);
    expect(out).toBe(Money("102.85714286"));
  });

  it("returns null when no rate and no anchor pair can derive it", () => {
    const map = new FxRateMap();
    map.setRate(rate("GBP", "JPY", 180));
    const out = convert(Money("100"), Currency("GBP"), Currency("CAD"), map);
    expect(out).toBeNull();
  });
});