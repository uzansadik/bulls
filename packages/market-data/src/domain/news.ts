/**
 * @openbulls/market-data — `NewsItem` value object.
 *
 * Normalized news row. `sentiment` is optional because most
 * providers don't expose it directly — the AI/agent layer computes
 * sentiment downstream when needed.
 */
import type { AssetSymbol, ProviderName } from "./brands";

export interface NewsItem {
  readonly title: string;
  readonly url: string;
  readonly source: string;
  readonly publishedAt: Date;
  readonly summary: string | null;
  readonly language: string | null;
  /** Asset the news is about. `null` for general market news. */
  readonly symbol: AssetSymbol | null;
  /** Sentiment in [-1, 1]. `null` when not provided. */
  readonly sentiment: number | null;
  readonly provider: ProviderName;
}
