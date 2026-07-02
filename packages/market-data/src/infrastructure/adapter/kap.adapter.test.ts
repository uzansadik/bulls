/**
 * @openbulls/market-data — KAP adapter news test.
 *
 * Verifies the public disclosure search endpoint produces a list of
 * NewsItem VOs from a fixture-shaped response.
 */
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../__tests__/setup";
import { AssetSymbol, ProviderName } from "../../domain/brands";
import { UnsupportedCapabilityError } from "../../domain/errors";
import { HttpClient } from "../http/http-client";
import { TokenBucketRateLimiter } from "../rate-limit/token-bucket";
import { KapAdapter } from "./kap.adapter";

function makeAdapter() {
  const limiter = new TokenBucketRateLimiter([
    {
      provider: ProviderName("kap"),
      capacity: 1000,
      refillPerSec: 1000,
      acquireTimeoutMs: 0,
    },
  ]);
  const http_ = new HttpClient(limiter, ProviderName("kap"), {
    maxRetries: 0,
    baseBackoffMs: 1,
    maxBackoffMs: 5,
  });
  return new KapAdapter(http_);
}

describe("KapAdapter", () => {
  it("parses disclosure search into NewsItems", async () => {
    server.use(
      http.post("https://www.kap.org.tr/tr/api/disclosure/search", () =>
        HttpResponse.json({
          disclosures: [
            {
              disclosureId: "1234567",
              title: "Bedelli sermaye artirimi",
              summary: "Yönetim kurulu karari",
              url: "https://www.kap.org.tr/tr/Bildirim/1234567",
              source: "kap",
              publishDate: "2026-07-01T10:00:00Z",
              memberOid: "98765",
            },
          ],
        }),
      ),
    );
    const r = await makeAdapter().getNews({
      symbol: AssetSymbol("M:98765"),
      from: new Date("2026-01-01"),
      to: new Date("2026-12-31"),
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.length).toBe(1);
      expect(r.value[0]?.title).toContain("Bedelli");
    }
  });

  it("returns UnsupportedCapabilityError for candles", async () => {
    const r = await makeAdapter().getCandles({
      symbol: AssetSymbol("M:98765"),
      interval: "1d" as never,
      from: new Date(),
      to: new Date(),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(UnsupportedCapabilityError);
  });
});
