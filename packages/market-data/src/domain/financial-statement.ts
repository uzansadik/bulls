/**
 * @openbulls/market-data — `FinancialStatement` value object.
 *
 * One period's reported financial statement. The heavy `rawData`
 * field holds the provider-specific payload (XBRL facts, KAP
 * parsed rows, Yahoo financial dictionary, etc.) so downstream
 * normalization can happen without re-fetching.
 *
 * `currency` is the reporting currency of the company, not the
 * display currency. Portfolio FX-adjustment happens in the
 * portfolio package.
 */
import type { AssetSymbol, Currency, ProviderName, StatementType } from "./brands";

export interface FinancialStatement {
  readonly symbol: AssetSymbol;
  readonly statementType: StatementType;
  /** "quarterly" | "annual" */
  readonly period: "quarterly" | "annual";
  readonly periodEnd: Date;
  readonly fiscalYear: number;
  readonly currency: Currency;
  readonly rawData: Readonly<Record<string, unknown>>;
  readonly provider: ProviderName;
}
