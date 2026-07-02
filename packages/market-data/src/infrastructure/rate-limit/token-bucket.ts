/**
 * @openbulls/market-data — token-bucket rate limiter.
 *
 * Process-local, per-provider. Tokens refill continuously at
 * `refillPerSec` up to `capacity`. `acquire(provider)` waits until a
 * slot is available (up to `acquireTimeoutMs`); `tryAcquire` is the
 * non-blocking variant.
 *
 * Why token bucket and not sliding window: most provider rate
 * limits are stated per minute (e.g. Yahoo "100 rpm") and bursts are
 * acceptable; the bucket's `capacity` makes that explicit.
 */
import type { ProviderName } from "../../domain/brands";

export interface RateLimitPolicy {
  readonly provider: ProviderName;
  /** Maximum burst size — initial tokens at start. */
  readonly capacity: number;
  /** Tokens added per second. */
  readonly refillPerSec: number;
  /** Advisory lock timeout for `acquire`. Default 5000 ms. */
  readonly acquireTimeoutMs: number;
}

export interface RateLimitPermit {
  release(): void;
}

export interface IRateLimiter {
  acquire(provider: ProviderName, cost?: number): Promise<RateLimitPermit>;
  tryAcquire(provider: ProviderName, cost?: number): RateLimitPermit | null;
}

interface BucketState {
  tokens: number;
  lastRefillMs: number;
  waiters: Array<() => void>;
}

export class TokenBucketRateLimiter implements IRateLimiter {
  private readonly buckets = new Map<ProviderName, BucketState>();
  private readonly policies = new Map<ProviderName, RateLimitPolicy>();
  private readonly defaultAcquireTimeoutMs: number;

  constructor(
    policies: ReadonlyArray<RateLimitPolicy>,
    options: { defaultAcquireTimeoutMs?: number; clock?: () => number } = {},
  ) {
    for (const p of policies) this.policies.set(p.provider, p);
    this.defaultAcquireTimeoutMs = options.defaultAcquireTimeoutMs ?? 5000;
    this.clock = options.clock ?? Date.now;
  }

  private readonly clock: () => number;

  private bucketFor(provider: ProviderName): {
    state: BucketState;
    policy: RateLimitPolicy;
  } {
    const policy = this.policies.get(provider);
    if (!policy) {
      throw new Error(`no rate-limit policy registered for provider ${provider}`);
    }
    let state = this.buckets.get(provider);
    if (!state) {
      state = {
        lastRefillMs: this.clock(),
        tokens: policy.capacity,
        waiters: [],
      };
      this.buckets.set(provider, state);
    }
    return { policy, state };
  }

  private refill(state: BucketState, policy: RateLimitPolicy): void {
    const now = this.clock();
    const elapsedSec = Math.max(0, (now - state.lastRefillMs) / 1000);
    state.tokens = Math.min(policy.capacity, state.tokens + elapsedSec * policy.refillPerSec);
    state.lastRefillMs = now;
  }

  private take(state: BucketState, cost: number): boolean {
    if (state.tokens >= cost) {
      state.tokens -= cost;
      return true;
    }
    return false;
  }

  tryAcquire(provider: ProviderName, cost = 1): RateLimitPermit | null {
    const { policy, state } = this.bucketFor(provider);
    this.refill(state, policy);
    if (!this.take(state, cost)) return null;
    return { release: () => {} };
  }

  acquire(provider: ProviderName, cost = 1): Promise<RateLimitPermit> {
    return new Promise((resolve, reject) => {
      const { policy, state } = this.bucketFor(provider);
      const deadline = this.clock() + policy.acquireTimeoutMs;

      const tryOnce = (): void => {
        this.refill(state, policy);
        if (this.take(state, cost)) {
          resolve({ release: () => {} });
          return;
        }
        if (this.clock() >= deadline) {
          reject(
            new Error(
              `rate-limit acquire timed out for ${provider} after ${policy.acquireTimeoutMs}ms`,
            ),
          );
          return;
        }
        // Wait proportional to how many tokens we're missing.
        const deficit = cost - state.tokens;
        const waitMs = Math.max(1, Math.ceil((deficit / policy.refillPerSec) * 1000));
        setTimeout(tryOnce, waitMs);
      };

      tryOnce();
    });
  }
}
