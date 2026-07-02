/**
 * @openbulls/market-data — candle schema parse tests.
 *
 * Validates the zod boundary at the provider → domain seam: a happy
 * parse produces a fully-branded Candle VO; a malformed payload
 * throws with a structured zod error.
 */
import { describe, expect, it } from "vitest";
import { candleSchema, parseCandle } from "./candle.schema";

describe("candleSchema", () => {
  it("parses a valid candle", () => {
    const result = candleSchema.safeParse({
      symbol: "AAPL",
      interval: "1d",
      openTime: new Date("2024-01-02T00:00:00Z"),
      closeTime: new Date("2024-01-02T23:59:59Z"),
      open: 150.0,
      high: 152.0,
      low: 148.0,
      close: 151.0,
      volume: 1_000_000,
      provider: "yahoo",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.symbol).toBe("AAPL");
      expect(result.data.close).toBe(151);
    }
  });

  it("rejects an unknown interval", () => {
    const result = candleSchema.safeParse({
      symbol: "AAPL",
      interval: "10s",
      openTime: new Date(),
      closeTime: new Date(),
      open: 1,
      high: 1,
      low: 1,
      close: 1,
      volume: null,
      provider: "yahoo",
    });
    expect(result.success).toBe(false);
  });

  it("parseCandle throws on malformed input", () => {
    expect(() => parseCandle({ symbol: "AAPL" })).toThrow();
  });
});
