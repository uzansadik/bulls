/**
 * zod schema + parser for the `NewsItem` VO.
 */
import { marketProviderEnum } from "@openbulls/db/schema";
import { z } from "zod";
import { AssetSymbol, ProviderName } from "../brands";
import type { NewsItem } from "../news";

export const newsSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  source: z.string().min(1),
  publishedAt: z.coerce.date(),
  summary: z.string().nullable(),
  language: z.string().min(2).max(8).nullable(),
  symbol: z.string().min(1).max(32).nullable(),
  sentiment: z.number().finite().min(-1).max(1).nullable(),
  provider: z.enum(marketProviderEnum.enumValues),
});

export type RawNewsItem = z.input<typeof newsSchema>;

export function parseNewsItem(raw: unknown): NewsItem {
  const p = newsSchema.parse(raw);
  return {
    title: p.title,
    url: p.url,
    source: p.source,
    publishedAt: p.publishedAt,
    summary: p.summary,
    language: p.language,
    symbol: p.symbol ? AssetSymbol(p.symbol) : null,
    sentiment: p.sentiment,
    provider: ProviderName(p.provider),
  };
}

export function parseNewsItems(raw: readonly unknown[]): readonly NewsItem[] {
  return raw.map((row) => parseNewsItem(row));
}
