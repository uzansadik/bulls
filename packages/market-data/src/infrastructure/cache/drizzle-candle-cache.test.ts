/**
 * @openbulls/market-data — In-memory candle cache test.
 *
 * The Drizzle-backed cache lives in a follow-up; for now we test the
 * in-memory cache that ships with the package.
 */
import { describe, expect, it } from "vitest";
import { AssetSymbol, Interval, ProviderName } from "../../domain/brands";
import type { Candle } from "../../domain/candle";
import { InMemoryCandleCache } from "./in-memory-cache";

function candle(openTime: string): Candle {
  return {
    symbol: AssetSymbol("AAPL"),
    interval: Interval("1d"),
    openTime: new Date(openTime),
    closeTime: new Date(new Date(openTime).getTime() + 86_400_000 - 1),
    open: 100,
    high: 110,
    low: 90,
    close: 105,
    volume: 1000,
    provider: ProviderName("yahoo"),
  };
}

describe("InMemoryCandleCache", () => {
  it("writes and reads candles filtered by [from, to]", async () => {
    const cache = new InMemoryCandleCache();
    const candles = [
      candle("2024-01-01T00:00:00Z"),
      candle("2024-01-02T00:00:00Z"),
      candle("2024-01-03T00:00:00Z"),
    ];
    const w = await cache.write({
      symbol: AssetSymbol("AAPL"),
      interval: Interval("1d"),
      candles,
      provider: ProviderName("yahoo"),
    });
    expect(w.ok).toBe(true);
    const r = await cache.read({
      symbol: AssetSymbol("AAPL"),
      interval: Interval("1d"),
      from: new Date("2024-01-02T00:00:00Z"),
      to: new Date("2024-01-03T00:00:00Z"),
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.length).toBe(2);
  });

  it("returns [] when no entry exists", async () => {
    const cache = new InMemoryCandleCache();
    const r = await cache.read({
      symbol: AssetSymbol("AAPL"),
      interval: Interval("1d"),
      from: new Date(),
      to: new Date(),
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual([]);
  });

  it("interval-aware freshness is exposed", () => {
    const cache = new InMemoryCandleCache();
    expect(cache.freshnessMs(Interval("1m"))).toBe(60_000);
    expect(cache.freshnessMs(Interval("1d"))).toBe(6 * 60 * 60 * 1000);
  });
});
