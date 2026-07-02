/**
 * @openbulls/market-data — Twelve Data adapter test.
 *
 * Mocks the `/time_series` endpoint and verifies the parsed candle
 * list (descending order).
 */
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../__tests__/setup";
import { AssetSymbol, Interval, ProviderName } from "../../domain/brands";
import { HttpClient } from "../http/http-client";
import { TokenBucketRateLimiter } from "../rate-limit/token-bucket";
import { TwelveDataAdapter } from "./twelvedata.adapter";

function makeAdapter() {
  const limiter = new TokenBucketRateLimiter([
    {
      provider: ProviderName("twelvedata"),
      capacity: 1000,
      refillPerSec: 1000,
      acquireTimeoutMs: 0,
    },
  ]);
  const http_ = new HttpClient(limiter, ProviderName("twelvedata"), {
    maxRetries: 0,
    baseBackoffMs: 1,
    maxBackoffMs: 5,
  });
  return new TwelveDataAdapter(http_, { apiKey: "test-key" });
}

describe("TwelveDataAdapter", () => {
  it("returns descending candles from /time_series", async () => {
    server.use(
      http.get("https://api.twelvedata.com/time_series", () =>
        HttpResponse.json({
          status: "ok",
          values: [
            {
              datetime: "2024-01-01",
              open: "150",
              high: "152",
              low: "148",
              close: "151",
              volume: "1000",
            },
            {
              datetime: "2024-01-02",
              open: "151",
              high: "153",
              low: "149",
              close: "152",
              volume: "1100",
            },
          ],
        }),
      ),
    );
    const r = await makeAdapter().getCandles({
      symbol: AssetSymbol("AAPL"),
      interval: Interval("1d"),
      from: new Date("2024-01-01"),
      to: new Date("2024-12-31"),
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.length).toBe(2);
      // descending: most recent first
      expect(r.value[0]?.openTime.getTime()).toBeGreaterThan(r.value[1]?.openTime.getTime() ?? 0);
    }
  });
});
