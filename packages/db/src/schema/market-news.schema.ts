import { sql } from "drizzle-orm";
import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { marketProviderEnum } from "./enums";
import { marketAssets } from "./market-assets.schema";

/**
 * News articles — can be asset-scoped (assetSymbol SET NULL keeps the
 * article even if the asset gets removed) or general (assetSymbol NULL).
 */
export const marketNews = pgTable(
  "market_news",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetSymbol: varchar("asset_symbol", { length: 32 }).references(() => marketAssets.symbol, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    summary: text("summary"),
    url: text("url").notNull(),
    source: varchar("source", { length: 64 }).notNull(),
    language: varchar("language", { length: 8 }).notNull().default("en"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    provider: marketProviderEnum("provider").notNull(),
    sentiment: numeric("sentiment", { precision: 4, scale: 3 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("market_news_url_uniq").on(table.url),
    index("market_news_symbol_published_idx").on(table.assetSymbol, sql`${table.publishedAt} DESC`),
    index("market_news_published_idx").on(sql`${table.publishedAt} DESC`),
  ],
);

export type MarketNews = typeof marketNews.$inferSelect;
export type NewMarketNews = typeof marketNews.$inferInsert;
