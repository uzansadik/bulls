/**
 * @openbulls/market-data — `FinancialRatio` value object.
 *
 * Ratios are returned as a flat key→number map rather than a fixed
 * struct because providers disagree on naming and granularity:
 * Yahoo uses `currentRatio`, SEC XBRL exposes `CurrentRatio`,
 * KAP may use `Cari Oran`. The downstream consumer (LLM agent,
 * portfolio scoring) can pick what it needs.
 */
import type { AssetSymbol, ProviderName } from "./brands";

export interface FinancialRatio {
  readonly symbol: AssetSymbol;
  readonly periodEnd: Date;
  readonly period: "quarterly" | "annual";
  readonly ratios: Readonly<Record<string, number>>;
  readonly provider: ProviderName;
}
