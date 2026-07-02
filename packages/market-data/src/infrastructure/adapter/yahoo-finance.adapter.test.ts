/**
 * @openbulls/market-data — Yahoo Finance adapter tests.
 *
 * Mocks the `query1.finance.yahoo.com/v8/finance/chart/{symbol}`
 * endpoint. Verifies that the candles + quote paths parse the
 * response correctly and that unsupported capabilities return
 * `UnsupportedCapabilityError`.
 */
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../__tests__/setup";
import { AssetSymbol, Interval, ProviderName } from "../../domain/brands";
import { SymbolNotFoundError, UnsupportedCapabilityError } from "../../domain/errors";
import { HttpClient } from "../http/http-client";
import { TokenBucketRateLimiter } from "../rate-limit/token-bucket";
import { YahooFinanceAdapter } from "./yahoo-finance.adapter";

function makeAdapter() {
  const limiter = new TokenBucketRateLimiter([
    {
      provider: ProviderName("yahoo"),
      capacity: 1000,
      refillPerSec: 1000,
      acquireTimeoutMs: 0,
    },
  ]);
  const http_ = new HttpClient(limiter, ProviderName("yahoo"), {
    maxRetries: 0,
    baseBackoffMs: 1,
    maxBackoffMs: 5,
  });
  return new YahooFinanceAdapter(http_, {
    userAgent: "test",
  });
}

describe("YahooFinanceAdapter", () => {
  it("returns parsed candles on a successful chart response", async () => {
    server.use(
      http.get("https://query1.finance.yahoo.com/v8/finance/chart/AAPL", () =>
        HttpResponse.json({
          chart: {
            result: [
              {
                meta: { symbol: "AAPL", currency: "USD" },
                timestamp: [1_700_000_000, 1_700_086_400],
                indicators: {
                  quote: [
                    {
                      open: [150, 151],
                      high: [152, 153],
                      low: [148, 149],
                      close: [151, 152],
                      volume: [1_000_000, 1_100_000],
                    },
                  ],
                  adjclose: [{ adjclose: [151, 152] }],
                },
              },
            ],
            error: null,
          },
        }),
      ),
    );
    const r = await makeAdapter().getCandles({
      symbol: AssetSymbol("AAPL"),
      interval: Interval("1d"),
      from: new Date("2023-01-01"),
      to: new Date("2024-12-31"),
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.length).toBe(2);
  });

  it("returns SymbolNotFoundError when the chart result is empty", async () => {
    server.use(
      http.get("https://query1.finance.yahoo.com/v8/finance/chart/NOPE", () =>
        HttpResponse.json({
          chart: { result: [], error: null },
        }),
      ),
    );
    const r = await makeAdapter().getCandles({
      symbol: AssetSymbol("NOPE"),
      interval: Interval("1d"),
      from: new Date(),
      to: new Date(),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(SymbolNotFoundError);
  });

  it("returns UnsupportedCapabilityError for financial_statements", async () => {
    const r = await makeAdapter().getFinancialStatements({
      symbol: AssetSymbol("AAPL"),
      statementType: "income_statement" as never,
      period: "annual",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(UnsupportedCapabilityError);
  });
});
