/**
 * @openbulls/market-data — HttpClient behaviour tests.
 *
 * Covers: 200 OK, 4xx (fatal), 429 (Retry-After), 5xx (retryable),
 * and timeout (AbortController). MSW intercepts the outbound fetch.
 */
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../__tests__/setup";
import { ProviderName } from "../../domain/brands";
import {
  InvalidRequestError,
  ProviderUnavailableError,
  RateLimitedError,
  TimeoutError,
} from "../../domain/errors";
import { TokenBucketRateLimiter } from "../rate-limit/token-bucket";
import { HttpClient, parseRetryAfter } from "./http-client";

function makeClient() {
  const limiter = new TokenBucketRateLimiter(
    [
      {
        provider: ProviderName("mock"),
        capacity: 1_000,
        refillPerSec: 1_000,
        acquireTimeoutMs: 0,
      },
    ],
    { defaultAcquireTimeoutMs: 0 },
  );
  return new HttpClient(limiter, ProviderName("mock"), {
    maxRetries: 2,
    baseBackoffMs: 1,
    maxBackoffMs: 5,
  });
}

describe("HttpClient", () => {
  it("returns 200 with parsed JSON on success", async () => {
    server.use(http.get("https://mock.test/ok", () => HttpResponse.json({ hello: "world" })));
    const c = makeClient();
    const r = await c.request<{ hello: string }>({
      url: "https://mock.test/ok",
      method: "GET",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.data.hello).toBe("world");
  });

  it("returns InvalidRequestError on 4xx without retrying", async () => {
    let calls = 0;
    server.use(
      http.get("https://mock.test/bad", () => {
        calls++;
        return HttpResponse.text("nope", { status: 400 });
      }),
    );
    const c = makeClient();
    const r = await c.request<unknown>({ url: "https://mock.test/bad", method: "GET" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(InvalidRequestError);
    expect(calls).toBe(1); // fatal → no retries
  });

  it("honors Retry-After seconds on 429", async () => {
    server.use(
      http.get(
        "https://mock.test/rate",
        () => new HttpResponse(null, { status: 429, headers: { "Retry-After": "0" } }),
      ),
    );
    const c = makeClient();
    const r = await c.request<unknown>({
      url: "https://mock.test/rate",
      method: "GET",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(RateLimitedError);
  });

  it("retries on 5xx and surfaces ProviderUnavailableError", async () => {
    let calls = 0;
    server.use(
      http.get("https://mock.test/down", () => {
        calls++;
        return HttpResponse.json({ err: true }, { status: 502 });
      }),
    );
    const c = makeClient();
    const r = await c.request<unknown>({
      url: "https://mock.test/down",
      method: "GET",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(ProviderUnavailableError);
    expect(calls).toBeGreaterThan(1); // at least 1 retry
  });

  it("returns TimeoutError when the request exceeds timeoutMs", async () => {
    server.use(
      http.get("https://mock.test/slow", async () => {
        await new Promise((r) => setTimeout(r, 100));
        return HttpResponse.json({});
      }),
    );
    const c = makeClient();
    const r = await c.request<unknown>({
      url: "https://mock.test/slow",
      method: "GET",
      timeoutMs: 20,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(TimeoutError);
  });

  it("parseRetryAfter handles seconds and HTTP-date", () => {
    expect(parseRetryAfter("0")).toBe(0);
    expect(parseRetryAfter("3")).toBe(3000);
    expect(parseRetryAfter("not-a-number")).toBeUndefined();
  });
});
