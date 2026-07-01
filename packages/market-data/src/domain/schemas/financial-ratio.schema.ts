/**
 * zod schema + parser for the `FinancialRatio` VO.
 *
 * `ratios` is a free-form `Record<string, number>` because providers
 * use different naming (`currentRatio` vs `CurrentRatio` vs
 * `Cari Oran`). Callers normalize as needed.
 */
import { marketProviderEnum } from "@openbulls/db/schema";
import { z } from "zod";
import { AssetSymbol, ProviderName } from "../brands";
import type { FinancialRatio } from "../financial-ratio";

export const financialRatioSchema = z.object({
  symbol: z.string().min(1).max(32),
  periodEnd: z.coerce.date(),
  period: z.enum(["quarterly", "annual"]),
  ratios: z.record(z.string(), z.number().finite()),
  provider: z.enum(marketProviderEnum.enumValues),
});

export type RawFinancialRatio = z.input<typeof financialRatioSchema>;

export function parseFinancialRatio(raw: unknown): FinancialRatio {
  const p = financialRatioSchema.parse(raw);
  return {
    symbol: AssetSymbol(p.symbol),
    periodEnd: p.periodEnd,
    period: p.period,
    ratios: p.ratios,
    provider: ProviderName(p.provider),
  };
}

export function parseFinancialRatios(raw: readonly unknown[]): readonly FinancialRatio[] {
  return raw.map((row) => parseFinancialRatio(row));
}
