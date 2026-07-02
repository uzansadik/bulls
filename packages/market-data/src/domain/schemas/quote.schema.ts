/**
 * zod schema + parser for the `Quote` VO.
 *
 * All extended fields (`dayHigh`, `dayLow`, ...) are nullable because
 * different providers expose different subsets — Yahoo has
 * `regularMarketDayHigh`, KAP may not have day-low, etc. UI layers
 * must treat `null` as "unknown", not as zero.
 */
import { marketProviderEnum } from "@openbulls/db/schema";
import { z } from "zod";
import { AssetSymbol, Currency, ProviderName } from "../brands";
import type { Quote } from "../quote";

const marketStateSchema = z.enum(["pre", "regular", "post", "closed"]);

export const quoteSchema = z.object({
  symbol: z.string().min(1).max(32),
  price: z.number().finite(),
  currency: z.string().min(3).max(8),
  asOf: z.coerce.date(),
  provider: z.enum(marketProviderEnum.enumValues),
  delayed: z.boolean(),
  dayHigh: z.number().finite().nullable(),
  dayLow: z.number().finite().nullable(),
  dayChange: z.number().finite().nullable(),
  dayChangePercent: z.number().finite().nullable(),
  volume: z.number().finite().nullable(),
  marketState: marketStateSchema.nullable(),
});

export type RawQuote = z.input<typeof quoteSchema>;

export function parseQuote(raw: unknown): Quote {
  const p = quoteSchema.parse(raw);
  return {
    symbol: AssetSymbol(p.symbol),
    price: p.price,
    currency: Currency(p.currency),
    asOf: p.asOf,
    provider: ProviderName(p.provider),
    delayed: p.delayed,
    dayHigh: p.dayHigh,
    dayLow: p.dayLow,
    dayChange: p.dayChange,
    dayChangePercent: p.dayChangePercent,
    volume: p.volume,
    marketState: p.marketState,
  };
}
