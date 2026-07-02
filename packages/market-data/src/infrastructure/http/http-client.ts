/**
 * @openbulls/market-data — HTTP client with retry, rate limiting, and
 * 429-aware backoff.
 *
 * Each `HttpClient` is bound to a single provider (`ProviderName`) and
 * acquires a rate-limit permit before every outbound request. The
 * adapter layer owns one client per provider so multiple concurrent
 * adapters don't share a bucket.
 *
 * Retry policy:
 *   - max 3 attempts (configurable)
 *   - 4xx (non-429) is fatal — no retry
 *   - 429 honors `Retry-After` header (delta-seconds or HTTP-date)
 *   - 5xx / network / timeout → exponential backoff with jitter
 *
 * Sleep is injected so tests can fast-forward time deterministically.
 */
import { type Result, err, ok } from "@openbulls/shared";
import type { ProviderName } from "../../domain/brands";
import {
  InvalidRequestError,
  type MarketDataError,
  NetworkError,
  ProviderUnavailableError,
  RateLimitedError,
  TimeoutError,
  isFatal,
  isRateLimited,
} from "../../domain/errors";
import type { LoggerLike } from "../log";
import { noopLogger } from "../log";
import type { IRateLimiter } from "../rate-limit/token-bucket";

// ── Request / response shapes ───────────────────────────────────────

export type HttpMethod = "GET" | "POST";

export interface HttpRequest {
  readonly url: string;
  readonly method: HttpMethod;
  readonly headers?: Readonly<Record<string, string>>;
  readonly query?: Readonly<Record<string, string | number | boolean>>;
  readonly body?: unknown;
  /** Per-attempt timeout. Default 8000. */
  readonly timeoutMs?: number;
  /**
   * Body decoder. `json` (default) calls `response.json()`;
   * `text` calls `response.text()` for XML / plaintext feeds.
   */
  readonly responseType?: "json" | "text";
}

export interface HttpResponse<T> {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly data: T;
}

export interface HttpClientOptions {
  readonly maxRetries?: number;
  readonly baseBackoffMs?: number;
  readonly maxBackoffMs?: number;
  /** Injectable sleep for deterministic tests. */
  readonly sleep?: (ms: number) => Promise<void>;
  /** Injectable clock for tests; default `Date.now`. */
  readonly clock?: () => number;
  readonly logger?: LoggerLike;
}

// ── Client ──────────────────────────────────────────────────────────

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_BACKOFF_MS = 250;
const DEFAULT_MAX_BACKOFF_MS = 8000;
const DEFAULT_TIMEOUT_MS = 8000;

export class HttpClient {
  private readonly rateLimiter: IRateLimiter;
  private readonly provider: ProviderName;
  private readonly maxRetries: number;
  private readonly baseBackoffMs: number;
  private readonly maxBackoffMs: number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly clock: () => number;
  private readonly logger: LoggerLike;

  constructor(rateLimiter: IRateLimiter, provider: ProviderName, options: HttpClientOptions = {}) {
    this.rateLimiter = rateLimiter;
    this.provider = provider;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.baseBackoffMs = options.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS;
    this.maxBackoffMs = options.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS;
    this.sleep = options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.clock = options.clock ?? Date.now;
    this.logger = options.logger ?? noopLogger;
  }

  async request<T>(req: HttpRequest): Promise<Result<HttpResponse<T>, MarketDataError>> {
    const fullUrl = applyQuery(req.url, req.query);
    let lastResult: Result<HttpResponse<T>, MarketDataError> | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const attemptResult = await this.attempt<T>(fullUrl, req);
      if (attemptResult.ok) return attemptResult;
      lastResult = attemptResult;
      const err = attemptResult.error;

      if (isFatal(err)) {
        this.logger.warn("http_client.fatal", {
          provider: this.provider,
          message: err.message,
        });
        return attemptResult;
      }

      if (attempt === this.maxRetries) break;

      const backoff = this.computeBackoffMs(err, attempt);
      this.logger.debug("http_client.retry", {
        attempt,
        backoffMs: backoff,
        provider: this.provider,
      });
      await this.sleep(backoff);
    }

    return lastResult ?? err(new ProviderUnavailableError({ provider: this.provider }));
  }

  // ── Internals ─────────────────────────────────────────────────────

  private async attempt<T>(
    url: string,
    req: HttpRequest,
  ): Promise<Result<HttpResponse<T>, MarketDataError>> {
    let permit: Awaited<ReturnType<IRateLimiter["acquire"]>>;
    try {
      permit = await this.rateLimiter.acquire(this.provider);
    } catch (e) {
      return err(
        new ProviderUnavailableError({
          cause: e,
          provider: this.provider,
        }),
      );
    }
    permit.release();

    const timeoutMs = req.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        body: req.body === undefined ? null : JSON.stringify(req.body),
        headers: {
          Accept: "application/json",
          ...(req.body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(req.headers ?? {}),
        },
        method: req.method,
        signal: controller.signal,
      });

      const headers = headersToRecord(response.headers);
      const status = response.status;

      if (status === 429) {
        const retryAfterMs = parseRetryAfter(headers["retry-after"]);
        return err(
          new RateLimitedError({
            provider: this.provider,
            ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
          }),
        );
      }
      if (status >= 500) {
        return err(
          new ProviderUnavailableError({
            provider: this.provider,
            status,
          }),
        );
      }
      if (status >= 400) {
        let body: string | undefined;
        try {
          body = await response.text();
        } catch {
          // ignore
        }
        return err(
          new InvalidRequestError({
            provider: this.provider,
            status,
            ...(body !== undefined ? { body } : {}),
          }),
        );
      }

      const data =
        req.responseType === "text"
          ? ((await response.text()) as unknown as T)
          : ((await response.json()) as T);
      return ok({ data, headers, status });
    } catch (e) {
      if (isAbortError(e)) {
        return err(new TimeoutError({ provider: this.provider, timeoutMs }));
      }
      return err(
        new NetworkError({
          cause: e,
          provider: this.provider,
        }),
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private computeBackoffMs(err: MarketDataError, attempt: number): number {
    if (isRateLimited(err) && err.data.retryAfterMs !== undefined) {
      return Math.min(this.maxBackoffMs, err.data.retryAfterMs);
    }
    const base = this.baseBackoffMs * 2 ** attempt;
    const jitter = (Math.random() - 0.5) * 2 * base * 0.2;
    return Math.min(this.maxBackoffMs, Math.max(1, base + jitter));
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

function applyQuery(
  url: string,
  query?: Readonly<Record<string, string | number | boolean>>,
): string {
  if (!query) return url;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) qs.set(k, String(v));
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}${qs.toString()}`;
}

function headersToRecord(h: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  h.forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}

/** Parse `Retry-After` (seconds integer or HTTP-date) to milliseconds. */
export function parseRetryAfter(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const asInt = Number.parseInt(trimmed, 10);
  if (!Number.isNaN(asInt) && trimmed === String(asInt)) {
    return asInt * 1000;
  }
  const dateMs = Date.parse(trimmed);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }
  return undefined;
}

function isAbortError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "name" in e &&
    (e as { name?: unknown }).name === "AbortError"
  );
}
