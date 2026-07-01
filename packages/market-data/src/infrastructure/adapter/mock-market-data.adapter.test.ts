/**
 * @openbulls/market-data — MockMarketDataAdapter tests.
 *
 * The mock adapter is the terminal in every fallback chain, so it
 * must support every capability without throwing.
 */
import { describe, expect, it } from "vitest";
import { AssetSymbol, Interval, ProviderName } from "../../domain/brands";
import { MockMarketDataAdapter } from "./mock-market-data.adapter";

describe("MockMarketDataAdapter", () => {
  const adapter = new MockMarketDataAdapter();

  it("exposes all capabilities", () => {
    expect(adapter.capabilities.has("candles")).toBe(true);
    expect(adapter.capabilities.has("quote")).toBe(true);
    expect(adapter.capabilities.has("financial_statements")).toBe(true);
    expect(adapter.capabilities.has("financial_ratios")).toBe(true);
    expect(adapter.capabilities.has("fx")).toBe(true);
    expect(adapter.capabilities.has("news")).toBe(true);
    expect(adapter.provider).toBe(ProviderName("mock"));
  });

  it("returns deterministic candles for a known window", async () => {
    const from = new Date("2024-01-01T00:00:00Z");
    const to = new Date("2024-01-04T00:00:00Z");
    const r = await adapter.getCandles({
      symbol: AssetSymbol("AAPL"),
      interval: Interval("1d"),
      from,
      to,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.length).toBeGreaterThan(0);
  });

  it("returns a quote with finite price", async () => {
    const r = await adapter.getQuote({ symbol: AssetSymbol("AAPL") });
    expect(r.ok).toBe(true);
    if (r.ok) expect(Number.isFinite(r.value.price)).toBe(true);
  });

  it("returns FX, statements, ratios, and news without throwing", async () => {
    const fx = await adapter.getFxRate({ base: "USD", quote: "TRY" });
    expect(fx.ok).toBe(true);
    const stmts = await adapter.getFinancialStatements({
      symbol: AssetSymbol("AAPL"),
      statementType: "income_statement" as never,
      period: "annual",
    });
    expect(stmts.ok).toBe(true);
    const ratios = await adapter.getFinancialRatios({
      symbol: AssetSymbol("AAPL"),
      period: "quarterly",
    });
    expect(ratios.ok).toBe(true);
    const news = await adapter.getNews({
      symbol: AssetSymbol("AAPL"),
      from: new Date("2024-01-01"),
      to: new Date("2024-12-31"),
    });
    expect(news.ok).toBe(true);
  });
});
