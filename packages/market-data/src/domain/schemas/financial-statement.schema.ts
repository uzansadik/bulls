/**
 * zod schema + parser for the `FinancialStatement` VO.
 *
 * `rawData` is a free-form object because providers disagree on
 * granular shape (XBRL facts vs KAP dict rows vs Yahoo flat
 * dictionary). The consumer is responsible for normalizing before
 * display.
 */
import { marketProviderEnum, statementTypeEnum } from "@openbulls/db/schema";
import { z } from "zod";
import { AssetSymbol, Currency, ProviderName, StatementType } from "../brands";
import type { FinancialStatement } from "../financial-statement";

export const financialStatementSchema = z.object({
  symbol: z.string().min(1).max(32),
  statementType: z.enum(statementTypeEnum.enumValues),
  period: z.enum(["quarterly", "annual"]),
  periodEnd: z.coerce.date(),
  fiscalYear: z.number().int().min(1900).max(2100),
  currency: z.string().min(3).max(8),
  rawData: z.record(z.unknown()),
  provider: z.enum(marketProviderEnum.enumValues),
});

export type RawFinancialStatement = z.input<typeof financialStatementSchema>;

export function parseFinancialStatement(raw: unknown): FinancialStatement {
  const p = financialStatementSchema.parse(raw);
  return {
    symbol: AssetSymbol(p.symbol),
    statementType: StatementType(p.statementType),
    period: p.period,
    periodEnd: p.periodEnd,
    fiscalYear: p.fiscalYear,
    currency: Currency(p.currency),
    rawData: p.rawData,
    provider: ProviderName(p.provider),
  };
}

export function parseFinancialStatements(raw: readonly unknown[]): readonly FinancialStatement[] {
  return raw.map((row) => parseFinancialStatement(row));
}
