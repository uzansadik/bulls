/**
 * zod schema + parser for the `Candle` VO.
 *
 * Used by every adapter's `getCandles` implementation: the provider
 * response is shaped (provider-specific) into a normalized array of
 * `RawCandle` first, then `parseCandle(raw)` is called on each entry
 * to validate and brand it.
 *
 * Enum fields are constrained to the DB enum values via `z.enum`
 * against `candleIntervalEnum.enumValues` so an out-of-range
 * interval fails fast at parse time.
 */
import { candleIntervalEnum, marketProviderEnum } from "@openbulls/db/schema";
import { z } from "zod";
import { AssetSymbol, Interval, ProviderName } from "../brands";
import type { Candle } from "../candle";

export const candleSchema = z.object({
  symbol: z.string().min(1).max(32),
  interval: z.enum(candleIntervalEnum.enumValues),
  openTime: z.coerce.date(),
  closeTime: z.coerce.date(),
  open: z.number().finite(),
  high: z.number().finite(),
  low: z.number().finite(),
  close: z.number().finite(),
  volume: z.number().finite().nullable(),
  provider: z.enum(marketProviderEnum.enumValues),
});

export type RawCandle = z.input<typeof candleSchema>;

export function parseCandle(raw: unknown): Candle {
  const p = candleSchema.parse(raw);
  return {
    symbol: AssetSymbol(p.symbol),
    interval: Interval(p.interval),
    openTime: p.openTime,
    closeTime: p.closeTime,
    open: p.open,
    high: p.high,
    low: p.low,
    close: p.close,
    volume: p.volume,
    provider: ProviderName(p.provider),
  };
}

export function parseCandles(raw: readonly unknown[]): readonly Candle[] {
  return raw.map((row) => parseCandle(row));
}
