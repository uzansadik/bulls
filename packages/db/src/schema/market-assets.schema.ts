import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { assetTypeEnum } from "./enums";

/**
 * Reference table for tradable / tracked instruments.
 * Every market-data row (price, candle, news…) FKs into `symbol` here.
 *
 * NOTE: `symbol` is the natural business key (e.g. "THYAO", "AAPL",
 * "USD/TRY") — used as FK target across all market-data tables. It is
 * declared UNIQUE so portfolio/news/candle joins can `references(symbol)`
 * directly. The `id` UUID is kept for internal join performance.
 */
export const marketAssets = pgTable(
  "market_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    symbol: varchar("symbol", { length: 32 }).notNull().unique(),
    exchange: varchar("exchange", { length: 16 }),
    name: text("name").notNull(),
    assetType: assetTypeEnum("asset_type").notNull(),
    currency: varchar("currency", { length: 8 }).notNull().default("TRY"),
    isin: varchar("isin", { length: 32 }),
    sector: varchar("sector", { length: 64 }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("market_assets_exchange_idx").on(table.exchange),
    index("market_assets_type_idx").on(table.assetType),
  ],
);

export type MarketAsset = typeof marketAssets.$inferSelect;
export type NewMarketAsset = typeof marketAssets.$inferInsert;
