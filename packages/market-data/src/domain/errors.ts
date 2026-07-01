/**
 * @openbulls/market-data — domain error types.
 *
 * All errors extend `AppError` from `@openbulls/shared` so they can be
 * carried in `Result<T, E>` and JSON-serialized for API responses.
 *
 * Code conventions: `market-data/<kebab-slug>`. The router + http
 * client use these codes to decide retry behavior:
 *
 *   isFatal(e)  → don't retry, surface the error (4xx, 404, capability
 *                 miss, schema permanently wrong).
 *   isRateLimited(e) → respect `Retry-After` header in the http client.
 *
 * The rest (5xx, network, timeout, parse, cache) are retryable.
 */
import { AppError } from "@openbulls/shared";
import type { AssetSymbol, ProviderName } from "./brands";

// ── Base ────────────────────────────────────────────────────────────
export abstract class MarketDataError extends AppError {
  // Concrete subclasses set their own `code` ("market-data/parse-error",
  // "market-data/rate-limited", ...). We do not declare it here because a
  // literal type on an abstract class would narrow subclasses' `code`
  // type, which we don't want.
}

// ── Provider-side failures (retryable) ──────────────────────────────

/** 5xx or network-tier failure: the provider is reachable but broken. */
export class ProviderUnavailableError extends MarketDataError {
  readonly code = "market-data/provider-unavailable" as const;
  readonly data: { provider: ProviderName; status?: number; cause?: unknown };
  constructor(data: { provider: ProviderName; status?: number; cause?: unknown }) {
    super(
      `provider ${data.provider} unavailable${data.status ? ` (${data.status})` : ""}`,
      data.cause !== undefined ? { cause: data.cause } : undefined,
    );
    this.data = data;
  }
}

/** HTTP 429 — back off until `retryAfterMs`. */
export class RateLimitedError extends MarketDataError {
  readonly code = "market-data/rate-limited" as const;
  readonly data: { provider: ProviderName; retryAfterMs?: number };
  constructor(data: { provider: ProviderName; retryAfterMs?: number }) {
    super(
      `rate limited: ${data.provider}${
        data.retryAfterMs ? `, retry in ${data.retryAfterMs}ms` : ""
      }`,
    );
    this.data = data;
  }
}

/** DNS, socket reset, TLS handshake failure. */
export class NetworkError extends MarketDataError {
  readonly code = "market-data/network-error" as const;
  readonly data: { provider: ProviderName; cause?: unknown };
  constructor(data: { provider: ProviderName; cause?: unknown }) {
    super(
      `network error talking to ${data.provider}`,
      data.cause !== undefined ? { cause: data.cause } : undefined,
    );
    this.data = data;
  }
}

/** AbortController fired. */
export class TimeoutError extends MarketDataError {
  readonly code = "market-data/timeout-error" as const;
  readonly data: { provider: ProviderName; timeoutMs: number };
  constructor(data: { provider: ProviderName; timeoutMs: number }) {
    super(`timeout after ${data.timeoutMs}ms: ${data.provider}`);
    this.data = data;
  }
}

/** Drizzle cache read/write failure. */
export class CacheError extends MarketDataError {
  readonly code = "market-data/cache-error" as const;
  readonly data: { operation: "read" | "write"; cause?: unknown };
  constructor(data: { operation: "read" | "write"; cause?: unknown }) {
    super(
      `cache ${data.operation} failed`,
      data.cause !== undefined ? { cause: data.cause } : undefined,
    );
    this.data = data;
  }
}

// ── Provider-side failures (fatal) ──────────────────────────────────

/** 4xx (non-429) — the request itself is wrong; retrying won't help. */
export class InvalidRequestError extends MarketDataError {
  readonly code = "market-data/invalid-request" as const;
  readonly data: { provider: ProviderName; status: number; body?: string };
  constructor(data: { provider: ProviderName; status: number; body?: string }) {
    super(`invalid request to ${data.provider} (${data.status})`);
    this.data = data;
  }
}

/** 404 or provider-specific "not found" — symbol doesn't exist. */
export class SymbolNotFoundError extends MarketDataError {
  readonly code = "market-data/symbol-not-found" as const;
  readonly data: { symbol: AssetSymbol; provider: ProviderName; message?: string };
  constructor(data: { symbol: AssetSymbol; provider: ProviderName; message?: string }) {
    super(
      `symbol not found: ${data.symbol} via ${data.provider}${
        data.message ? ` — ${data.message}` : ""
      }`,
    );
    this.data = data;
  }
}

/** Adapter doesn't implement this capability. Router uses this as a
 *  signal to move to the next provider in the chain. */
export class UnsupportedCapabilityError extends MarketDataError {
  readonly code = "market-data/unsupported-capability" as const;
  readonly data: { provider: ProviderName; capability: string };
  constructor(data: { provider: ProviderName; capability: string }) {
    super(`${data.provider} does not support capability: ${data.capability}`);
    this.data = data;
  }
}

// ── Schema/parse failures (retryable; provider shape may be transient) ──

/** zod parse failed on a provider response. */
export class ParseError extends MarketDataError {
  readonly code = "market-data/parse-error" as const;
  readonly data: { provider: ProviderName; source: string; cause?: unknown };
  constructor(data: { provider: ProviderName; source: string; cause?: unknown }) {
    super(
      `parse error from ${data.provider} (${data.source})`,
      data.cause !== undefined ? { cause: data.cause } : undefined,
    );
    this.data = data;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Errors the router should NOT retry through the fallback chain. */
export function isFatal(e: MarketDataError): boolean {
  return (
    e instanceof InvalidRequestError ||
    e instanceof SymbolNotFoundError ||
    e instanceof UnsupportedCapabilityError
  );
}

/** Type guard for the 429 case — used by the http client to honor `Retry-After`. */
export function isRateLimited(e: MarketDataError): e is RateLimitedError {
  return e instanceof RateLimitedError;
}
