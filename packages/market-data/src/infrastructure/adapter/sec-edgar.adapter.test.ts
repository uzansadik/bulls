/**
 * @openbulls/market-data — SEC EDGAR adapter tests.
 *
 * Verifies that companyfacts XBRL JSON is walked correctly for
 * financial statements + ratios, and that the submissions feed
 * exposes filings as NewsItems.
 */
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../__tests__/setup";
import { AssetSymbol, ProviderName } from "../../domain/brands";
import { HttpClient } from "../http/http-client";
import { TokenBucketRateLimiter } from "../rate-limit/token-bucket";
import { SecEdgarAdapter } from "./sec-edgar.adapter";

function makeAdapter() {
  const limiter = new TokenBucketRateLimiter([
    {
      provider: ProviderName("sec"),
      capacity: 1000,
      refillPerSec: 1000,
      acquireTimeoutMs: 0,
    },
  ]);
  const http_ = new HttpClient(limiter, ProviderName("sec"), {
    maxRetries: 0,
    baseBackoffMs: 1,
    maxBackoffMs: 5,
  });
  return new SecEdgarAdapter(http_, { userAgent: "test" });
}

describe("SecEdgarAdapter", () => {
  it("parses companyfacts → financial statements", async () => {
    server.use(
      http.get("https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json", () =>
        HttpResponse.json({
          facts: {
            "us-gaap": {
              Revenues: {
                units: {
                  USD: [
                    {
                      val: 100,
                      unit: "USD",
                      end: "2023-12-31",
                      fy: 2023,
                      fp: "FY",
                      form: "10-K",
                      accn: "0000320193-24-000001",
                    },
                  ],
                },
              },
            },
          },
        }),
      ),
    );
    const r = await makeAdapter().getFinancialStatements({
      symbol: AssetSymbol("C:0000320193"),
      statementType: "income_statement" as never,
      period: "annual",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.length).toBe(1);
      expect(r.value[0]?.fiscalYear).toBe(2023);
    }
  });

  it("parses submissions → news items", async () => {
    server.use(
      http.get("https://data.sec.gov/submissions/CIK0000320193.json", () =>
        HttpResponse.json({
          cik: "0000320193",
          filings: {
            recent: {
              form: ["8-K", "10-K"],
              filingDate: ["2026-06-01", "2026-05-01"],
              accessionNumber: ["0000320193-26-000010", "0000320193-26-000009"],
              primaryDocument: ["doc1.htm", "doc2.htm"],
              primaryDocDescription: ["Item 5.02", "Annual Report"],
            },
          },
        }),
      ),
    );
    const r = await makeAdapter().getNews({
      symbol: AssetSymbol("C:0000320193"),
      from: new Date("2026-01-01"),
      to: new Date("2026-12-31"),
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.length).toBe(2);
      expect(r.value[0]?.title).toContain("8-K");
    }
  });
});
