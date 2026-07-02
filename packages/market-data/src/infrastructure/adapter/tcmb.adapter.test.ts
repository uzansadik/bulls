/**
 * @openbulls/market-data — TCMB legacy XML adapter test.
 *
 * Verifies that a USD/TRY rate is extracted from the legacy
 * `tcmb.gov.tr/kurlar/...` XML feed. The handler URL is hardcoded
 * to a fixed `asOf` so MSW matches the absolute path the adapter
 * builds.
 */
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../__tests__/setup";
import { ProviderName } from "../../domain/brands";
import { SymbolNotFoundError, UnsupportedCapabilityError } from "../../domain/errors";
import { HttpClient } from "../http/http-client";
import { TokenBucketRateLimiter } from "../rate-limit/token-bucket";
import { TcmbAdapter } from "./tcmb.adapter";

function makeAdapter() {
  const limiter = new TokenBucketRateLimiter([
    {
      provider: ProviderName("tcmb"),
      capacity: 1000,
      refillPerSec: 1000,
      acquireTimeoutMs: 0,
    },
  ]);
  const http_ = new HttpClient(limiter, ProviderName("tcmb"), {
    maxRetries: 0,
    baseBackoffMs: 1,
    maxBackoffMs: 5,
  });
  return new TcmbAdapter(http_);
}

describe("TcmbAdapter (legacy XML)", () => {
  it("extracts USD/TRY rate from legacy XML", async () => {
    server.use(
      http.get("https://www.tcmb.gov.tr/kurlar/202607/01072026.xml", () =>
        HttpResponse.text(
          `<?xml version="1.0" encoding="UTF-8"?>
<Tarih_Date Tarih="01.07.2026" Date="07/01/2026" Bulten_No="2026/127">
  <Currency CrossOrder="0" Kod="USD" CurrencyName="ABD DOLARI">
    <ForexBuying>32.1234</ForexBuying>
    <ForexSelling>32.4567</ForexSelling>
  </Currency>
  <Currency CrossOrder="1" Kod="EUR" CurrencyName="EURO">
    <ForexBuying>34.5678</ForexBuying>
    <ForexSelling>34.8901</ForexSelling>
  </Currency>
</Tarih_Date>`,
          { headers: { "content-type": "application/xml; charset=utf-8" } },
        ),
      ),
    );
    const r = await makeAdapter().getFxRate({
      base: "USD",
      quote: "TRY",
      asOf: new Date(Date.UTC(2026, 6, 1)),
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.rate).toBeCloseTo(32.1234, 4);
  });

  it("returns SymbolNotFoundError for unknown currency", async () => {
    server.use(
      http.get("https://www.tcmb.gov.tr/kurlar/202607/01072026.xml", () =>
        HttpResponse.text(
          `<?xml version="1.0"?>
<Tarih_Date Tarih="01.07.2026">
  <Currency Kod="USD"><ForexBuying>1.0</ForexBuying></Currency>
</Tarih_Date>`,
          { headers: { "content-type": "application/xml" } },
        ),
      ),
    );
    const r = await makeAdapter().getFxRate({
      base: "EUR",
      quote: "USD",
      asOf: new Date(Date.UTC(2026, 6, 1)),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(SymbolNotFoundError);
  });

  it("returns UnsupportedCapabilityError for candles", async () => {
    const r = await makeAdapter().getCandles({
      symbol: "X" as never,
      interval: "1d" as never,
      from: new Date(),
      to: new Date(),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(UnsupportedCapabilityError);
  });
});
