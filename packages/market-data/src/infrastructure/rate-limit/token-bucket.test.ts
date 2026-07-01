/**
 * @openbulls/market-data — token bucket rate limiter tests.
 *
 * Validates: capacity burst, refill-after-wait, and acquire timeout
 * when the bucket is exhausted.
 */
import { describe, expect, it } from "vitest";
import { ProviderName } from "../../domain/brands";
import { TokenBucketRateLimiter } from "./token-bucket";

describe("TokenBucketRateLimiter", () => {
  it("tryAcquire respects capacity", () => {
    const limiter = new TokenBucketRateLimiter(
      [
        {
          provider: ProviderName("mock"),
          capacity: 3,
          refillPerSec: 0,
          acquireTimeoutMs: 100,
        },
      ],
      { defaultAcquireTimeoutMs: 100 },
    );
    expect(limiter.tryAcquire(ProviderName("mock"))).not.toBeNull();
    expect(limiter.tryAcquire(ProviderName("mock"))).not.toBeNull();
    expect(limiter.tryAcquire(ProviderName("mock"))).not.toBeNull();
    expect(limiter.tryAcquire(ProviderName("mock"))).toBeNull();
  });

  it("refills tokens after a wait", async () => {
    let now = 0;
    const limiter = new TokenBucketRateLimiter(
      [
        {
          provider: ProviderName("mock"),
          capacity: 2,
          refillPerSec: 1, // 1 token / second
          acquireTimeoutMs: 100,
        },
      ],
      { clock: () => now, defaultAcquireTimeoutMs: 100 },
    );
    expect(limiter.tryAcquire(ProviderName("mock"))).not.toBeNull();
    expect(limiter.tryAcquire(ProviderName("mock"))).not.toBeNull();
    expect(limiter.tryAcquire(ProviderName("mock"))).toBeNull();
    now = 1500; // 1.5s elapsed → ~1 token
    expect(limiter.tryAcquire(ProviderName("mock"))).not.toBeNull();
  });

  it("acquire rejects on timeout when the bucket is empty", async () => {
    const limiter = new TokenBucketRateLimiter(
      [
        {
          provider: ProviderName("mock"),
          capacity: 1,
          refillPerSec: 0,
          acquireTimeoutMs: 50,
        },
      ],
      { defaultAcquireTimeoutMs: 50 },
    );
    await limiter.acquire(ProviderName("mock")); // burn the only token
    await expect(limiter.acquire(ProviderName("mock"))).rejects.toThrow(/timed out/);
  });

  it("throws when no policy is registered for a provider", () => {
    const limiter = new TokenBucketRateLimiter([], { defaultAcquireTimeoutMs: 0 });
    expect(() => limiter.tryAcquire(ProviderName("kap"))).toThrow(/no rate-limit policy/);
  });
});
