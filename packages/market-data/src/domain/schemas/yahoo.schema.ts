/**
 * zod schema for the raw `query1.finance.yahoo.com/v8/finance/chart`
 * response shape. We only model the fields we actually consume
 * (chart.result[].meta, .timestamp[], .indicators.quote[0]*.open/high/
 * low/close/volume, .indicators.adjclose[0].adjclose); anything else
 * is allowed to slip through unchanged so Yahoo can extend their
 * payload without breaking us.
 */
import { z } from "zod";

const yahooNumber = z.number().finite().nullable();

const yahooChartMeta = z
  .object({
    symbol: z.string().optional(),
    regularMarketPrice: yahooNumber.optional(),
    regularMarketDayHigh: yahooNumber.optional(),
    regularMarketDayLow: yahooNumber.optional(),
    regularMarketVolume: yahooNumber.optional(),
    regularMarketTime: z.number().int().optional(),
    chartPreviousClose: yahooNumber.optional(),
    previousClose: yahooNumber.optional(),
    currency: z.string().optional(),
    marketState: z.string().optional(),
  })
  .passthrough();

const yahooQuoteBlock = z
  .object({
    open: z.array(yahooNumber).optional(),
    high: z.array(yahooNumber).optional(),
    low: z.array(yahooNumber).optional(),
    close: z.array(yahooNumber).optional(),
    volume: z.array(yahooNumber).optional(),
  })
  .passthrough();

const yahooAdjcloseBlock = z
  .object({
    adjclose: z.array(yahooNumber).optional(),
  })
  .passthrough();

const yahooResult = z
  .object({
    meta: yahooChartMeta.optional(),
    timestamp: z.array(z.number().int()).optional(),
    indicators: z
      .object({
        quote: z.array(yahooQuoteBlock).optional(),
        adjclose: z.array(yahooAdjcloseBlock).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const yahooChartResponseSchema = z
  .object({
    chart: z
      .object({
        result: z.array(yahooResult).optional(),
        error: z
          .object({
            code: z.string(),
            description: z.string().optional(),
          })
          .nullable()
          .optional(),
      })
      .passthrough(),
  })
  .passthrough();

export type YahooChartResponse = z.infer<typeof yahooChartResponseSchema>;
