/**
 * zod schema + parser for the `FxRate` VO.
 */
import { marketProviderEnum } from "@openbulls/db/schema";
import { z } from "zod";
import { Currency, ProviderName } from "../brands";
import type { FxRate } from "../fx-rate";

export const fxRateSchema = z.object({
  base: z.string().min(3).max(8),
  quote: z.string().min(3).max(8),
  rate: z.number().finite().positive(),
  asOf: z.coerce.date(),
  provider: z.enum(marketProviderEnum.enumValues),
});

export type RawFxRate = z.input<typeof fxRateSchema>;

export function parseFxRate(raw: unknown): FxRate {
  const p = fxRateSchema.parse(raw);
  return {
    base: Currency(p.base),
    quote: Currency(p.quote),
    rate: p.rate,
    asOf: p.asOf,
    provider: ProviderName(p.provider),
  };
}
