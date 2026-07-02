/**
 * @openbulls/market-data — default fallback policy.
 *
 * Pure function `defaultPolicy(input) -> readonly ProviderName[]`.
 * Stateless and easy to unit-test; injected into
 * `DefaultProviderRouter` so apps can override it.
 *
 * Heuristics:
 *
 *   - `*.IS` or BIST exchange     ⇒ kap  → yahoo  → mock
 *   - US (NASDAQ/NYSE/AMEX)       ⇒ yahoo → twelvedata → sec → mock
 *   - FX with TRY side            ⇒ tcmb → yahoo → mock
 *   - FX, non-TRY                 ⇒ yahoo → mock
 *   - Crypto (`BTC-USD`, ...)     ⇒ yahoo → mock
 *   - 1m/5m intraday candles      ⇒ twelvedata → yahoo → mock
 *   - Default                     ⇒ yahoo → twelvedata → mock
 */
import { ProviderName } from "../../domain/brands";
import type {
  AdapterCapability,
  RouterPolicy,
  RouterPolicyInput,
} from "../../domain/ports/router.port";

const KAP = ProviderName("kap");
const YAHOO = ProviderName("yahoo");
const TWELVEDATA = ProviderName("twelvedata");
const SEC = ProviderName("sec");
const TCMB = ProviderName("tcmb");
const MOCK = ProviderName("mock");

const FX_SYMBOL_PATTERN = /^[A-Z]{3}[A-Z]{3}$/;

export const defaultPolicy: RouterPolicy = (input: RouterPolicyInput) => {
  const { symbol, capability } = input;
  const raw = String(symbol);
  const exchange = input.asset?.exchange?.toUpperCase() ?? null;

  // ── FX ─────────────────────────────────────────────────────────
  if (capability === "fx") {
    return fxChain(raw);
  }

  // ── Candles: prefer tick-grade provider for small intervals ────
  if (capability === "candles") {
    const interval = extractIntervalFromSymbol(raw);
    if (interval && (interval === "1m" || interval === "5m")) {
      return [TWELVEDATA, YAHOO, MOCK];
    }
    return assetChain(raw, exchange, capability);
  }

  // ── Everything else routes through assetChain ──────────────────
  return assetChain(raw, exchange, capability);
};

function assetChain(
  raw: string,
  exchange: string | null,
  _capability: AdapterCapability,
): readonly ProviderName[] {
  // BIST: KAP primary for news / financial_statements; Yahoo for prices
  if (exchange === "BIST" || raw.endsWith(".IS")) {
    return [KAP, YAHOO, MOCK];
  }
  // Crypto / forex-shaped symbols: Yahoo primary
  if (raw.includes("-") && /[A-Z]{3,4}-[A-Z]{3,4}/.test(raw)) {
    return [YAHOO, MOCK];
  }
  // US listings
  if (exchange === "NASDAQ" || exchange === "NYSE" || exchange === "AMEX") {
    return [YAHOO, TWELVEDATA, SEC, MOCK];
  }
  return [YAHOO, TWELVEDATA, MOCK];
}

function fxChain(raw: string): readonly ProviderName[] {
  if (!FX_SYMBOL_PATTERN.test(raw.toUpperCase())) {
    return [YAHOO, MOCK];
  }
  const upper = raw.toUpperCase();
  if (upper.endsWith("TRY") || upper.startsWith("TRY")) {
    return [TCMB, YAHOO, MOCK];
  }
  return [YAHOO, MOCK];
}

/** Symbols may encode the interval via a `:` separator (legacy). */
function extractIntervalFromSymbol(raw: string): string | null {
  const parts = raw.split(":");
  return parts[1] ?? null;
}
