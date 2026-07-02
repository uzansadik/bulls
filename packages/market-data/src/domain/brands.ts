import type {
  CandleInterval,
  MarketProvider,
  StatementType as RawStatementType,
  TechnicalIndicatorType as RawTechnicalIndicatorType,
} from "@openbulls/db/schema";
/**
 * @openbulls/market-data — branded (nominal) primitives.
 *
 * TypeScript's structural typing treats `string` and `string` as
 * interchangeable, so passing a `Currency` where an `AssetSymbol` is
 * expected would compile cleanly. Branding fixes this with a phantom
 * tag from `@openbulls/shared`.
 *
 * Each line declares one branded type AND one factory function with
 * the same identifier — the `type` lives in the type space, the
 * `const` lives in the value space. Consumers can write:
 *
 *   import { AssetSymbol } from "@openbulls/market-data";
 *   const sym: AssetSymbol = AssetSymbol("AAPL");
 *
 * Smart constructors are identity casts — they do not validate input.
 * Validation lives at the boundary (zod schemas in
 * `domain/schemas/`, Drizzle row mapping, provider response parse).
 */
import type { Brand } from "@openbulls/shared";

// ── AssetSymbol ─────────────────────────────────────────────────────
// Natural business key for a tradable / tracked instrument. Comes from
// `market_assets.symbol` (UNIQUE VARCHAR(32)). Examples: "AAPL",
// "THYAO.IS", "BTC-USD", "USD/TRY".
export type AssetSymbol = Brand<string, "AssetSymbol">;
export const AssetSymbol = (s: string): AssetSymbol => s as AssetSymbol;

// ── Interval ────────────────────────────────────────────────────────
// Branded `CandleInterval` from the DB enum so callers can't pass a
// raw string. The raw enum type stays internal; the branded alias is
// what crosses the application boundary.
export type Interval = Brand<CandleInterval, "Interval">;
export const Interval = (i: CandleInterval): Interval => i as Interval;

// ── IndicatorType ───────────────────────────────────────────────────
// Branded `TechnicalIndicatorType` (RSI, MACD, SMA, EMA, BB, ...).
export type IndicatorType = Brand<RawTechnicalIndicatorType, "IndicatorType">;
export const IndicatorType = (t: RawTechnicalIndicatorType): IndicatorType => t as IndicatorType;

// ── ProviderName ────────────────────────────────────────────────────
// Branded `MarketProvider` (yahoo, twelvedata, kap, tcmb, sec, mock,
// manual). Used as router chain element and adapter identification.
// The smart constructor accepts any string — production callers pass
// `MarketProvider` literals; tests pass arbitrary tags for stub chains.
export type ProviderName = Brand<MarketProvider, "ProviderName">;
export const ProviderName = (p: string): ProviderName => p as ProviderName;

// ── StatementType ───────────────────────────────────────────────────
// Branded `StatementType` (balance_sheet, income_statement,
// cash_flow, ...).
export type StatementType = Brand<RawStatementType, "StatementType">;
export const StatementType = (s: RawStatementType): StatementType => s as StatementType;

// ── Currency ────────────────────────────────────────────────────────
// ISO 4217 currency code (USD, TRY, EUR, ...). Branded so a numeric
// string can't be confused with another identifier.
export type Currency = Brand<string, "Currency">;
export const Currency = (s: string): Currency => s as Currency;
