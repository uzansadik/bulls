/**
 * zod schema + parser for the `Indicator` VO.
 *
 * `IndicatorPoint` allows either a scalar (`value`) or a keyed map
 * (`values`) per point — RSI uses scalar, MACD/Bollinger use the
 * keyed map. Exactly one of the two is expected to be populated per
 * point; the parser is permissive (both null is allowed at warmup).
 */
import {
  candleIntervalEnum,
  marketProviderEnum,
  technicalIndicatorTypeEnum,
} from "@openbulls/db/schema";
import { z } from "zod";
import { AssetSymbol, IndicatorType, Interval, ProviderName } from "../brands";
import type { Indicator, IndicatorPoint } from "../indicator";

const indicatorPointSchema = z.object({
  asOf: z.coerce.date(),
  value: z.number().finite().nullable(),
  values: z.record(z.string(), z.number().finite()).nullable(),
});

export const indicatorSchema = z.object({
  symbol: z.string().min(1).max(32),
  type: z.enum(technicalIndicatorTypeEnum.enumValues),
  interval: z.enum(candleIntervalEnum.enumValues),
  asOf: z.coerce.date(),
  params: z.record(z.string(), z.number().finite()),
  series: z.array(indicatorPointSchema),
  provider: z.enum(marketProviderEnum.enumValues),
});

export type RawIndicator = z.input<typeof indicatorSchema>;

export function parseIndicator(raw: unknown): Indicator {
  const p = indicatorSchema.parse(raw);
  const series: IndicatorPoint[] = p.series.map((row) => ({
    asOf: row.asOf,
    value: row.value,
    values: row.values,
  }));
  return {
    symbol: AssetSymbol(p.symbol),
    type: IndicatorType(p.type),
    interval: Interval(p.interval),
    asOf: p.asOf,
    params: p.params,
    series,
    provider: ProviderName(p.provider),
  };
}
