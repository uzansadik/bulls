/**
 * @openbulls/market-data — default per-provider rate-limit policies.
 *
 * These numbers are conservative. Override via `MARKET_DATA_RATE_LIMIT_*`
 * env vars in the composition root if you have paid-tier quotas.
 *
 *   yahoo       100 burst @ 100/60 tok/s   (unofficial `query1` is
 *                                            forgiving but Yahoo can
 *                                            IP-throttle heavy users)
 *   twelvedata    8 burst @ 8/60 tok/s     (free tier default)
 *   kap          60 burst @ 1 tok/s        (resmi API sıkı)
 *   sec          10 burst @ 10/60 tok/s    (EDGAR: 10 req/s published)
 *   tcmb          5 burst @ 5/60 tok/s     (EVDS conservative)
 *   mock          unlimited                (used by tests + dev)
 */
import { ProviderName } from "../../domain/brands";
import type { RateLimitPolicy } from "./token-bucket";

export const DEFAULT_RATE_LIMIT_POLICIES: ReadonlyArray<RateLimitPolicy> = [
  {
    acquireTimeoutMs: 5000,
    capacity: 100,
    provider: ProviderName("yahoo"),
    refillPerSec: 100 / 60,
  },
  {
    acquireTimeoutMs: 8000,
    capacity: 8,
    provider: ProviderName("twelvedata"),
    refillPerSec: 8 / 60,
  },
  {
    acquireTimeoutMs: 10_000,
    capacity: 60,
    provider: ProviderName("kap"),
    refillPerSec: 1,
  },
  {
    acquireTimeoutMs: 5000,
    capacity: 10,
    provider: ProviderName("sec"),
    refillPerSec: 10 / 60,
  },
  {
    acquireTimeoutMs: 3000,
    capacity: 5,
    provider: ProviderName("tcmb"),
    refillPerSec: 5 / 60,
  },
  {
    acquireTimeoutMs: 0,
    capacity: Number.MAX_SAFE_INTEGER,
    provider: ProviderName("mock"),
    refillPerSec: 1000,
  },
];
