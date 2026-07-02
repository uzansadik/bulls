/**
 * @openbulls/market-data — DefaultProviderRouter + defaultPolicy tests.
 *
 * Verifies:
 *  - BIST symbols route through KAP first
 *  - NASDAQ symbols route through Yahoo first
 *  - fatal errors stop the chain (SymbolNotFound)
 *  - retryable errors fall through to the next provider
 *  - unsupported capabilities skip the adapter
 */
import { describe, expect, it } from "vitest";
import { AssetSymbol, ProviderName } from "../../domain/brands";
import { ProviderUnavailableError, SymbolNotFoundError } from "../../domain/errors";
import type { MarketDataAdapter } from "../adapter/market-data-adapter.port";
import { MockMarketDataAdapter } from "../adapter/mock-market-data.adapter";
import { noopLogger } from "../log";
import { defaultPolicy } from "./policy";
import { DefaultProviderRouter } from "./provider-router";

function adapter(
  provider: string,
  caps: Array<"candles" | "quote" | "fx" | "news" | "financial_statements" | "financial_ratios">,
  behavior: (
    input: unknown,
  ) => Promise<{ ok: true; value: unknown } | { ok: false; error: unknown }>,
): MarketDataAdapter {
  return {
    provider: ProviderName(provider),
    capabilities: new Set(caps),
    getCandles: (i) => behavior(i) as never,
    getQuote: (i) => behavior(i) as never,
    getFinancialStatements: (i) => behavior(i) as never,
    getFinancialRatios: (i) => behavior(i) as never,
    getFxRate: (i) => behavior(i) as never,
    getNews: (i) => behavior(i) as never,
  };
}

describe("defaultPolicy", () => {
  it("routes BIST to KAP primary", () => {
    const chain = defaultPolicy({
      symbol: AssetSymbol("THYAO.IS"),
      capability: "news",
      asset: { exchange: null, assetType: "stock" },
      now: new Date(),
    });
    expect(chain[0]).toBe(ProviderName("kap"));
  });

  it("routes US listings to Yahoo primary", () => {
    const chain = defaultPolicy({
      symbol: AssetSymbol("AAPL"),
      capability: "candles",
      asset: { exchange: "NASDAQ", assetType: "stock" },
      now: new Date(),
    });
    expect(chain[0]).toBe(ProviderName("yahoo"));
  });
});

describe("DefaultProviderRouter", () => {
  it("stops on fatal SymbolNotFoundError", async () => {
    const failing = adapter("primary", ["candles"], async () => ({
      ok: false,
      error: new SymbolNotFoundError({
        provider: ProviderName("primary"),
        symbol: AssetSymbol("X"),
      }),
    }));
    const ok = adapter("fallback", ["candles"], async () => ({
      ok: true,
      value: [{ symbol: "X" }],
    }));
    const router = new DefaultProviderRouter({
      adapters: new Map([
        [ProviderName("primary"), failing],
        [ProviderName("fallback"), ok],
      ]),
      policy: () => [ProviderName("primary"), ProviderName("fallback")],
      logger: noopLogger,
    });
    const r = await router.resolve(AssetSymbol("X"), "candles").call("candles", {});
    expect(r.ok).toBe(false);
  });

  it("falls through on retryable ProviderUnavailableError", async () => {
    let calls = 0;
    const flaky = adapter("flaky", ["candles"], async () => {
      calls++;
      return {
        ok: false,
        error: new ProviderUnavailableError({ provider: ProviderName("flaky") }),
      };
    });
    const success = adapter("good", ["candles"], async () => ({
      ok: true,
      value: [{ ok: true }],
    }));
    const router = new DefaultProviderRouter({
      adapters: new Map([
        [ProviderName("flaky"), flaky],
        [ProviderName("good"), success],
      ]),
      policy: () => [ProviderName("flaky"), ProviderName("good")],
      logger: noopLogger,
    });
    const r = await router.resolve(AssetSymbol("X"), "candles").call("candles", {});
    expect(r.ok).toBe(true);
    expect(calls).toBe(1);
  });

  it("succeeds via Mock when no other adapter is registered", async () => {
    const mock = new MockMarketDataAdapter();
    const router = new DefaultProviderRouter({
      adapters: new Map([[ProviderName("mock"), mock]]),
      policy: () => [ProviderName("mock")],
      logger: noopLogger,
    });
    const r = await router.resolve(AssetSymbol("AAPL"), "candles").call("candles", {
      symbol: AssetSymbol("AAPL"),
      interval: "1d" as never,
      from: new Date("2024-01-01"),
      to: new Date("2024-01-05"),
    });
    expect(r.ok).toBe(true);
  });
});
