import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { candleIntervalEnum, marketProviderEnum } from "./enums";
import { marketAssets } from "./market-assets.schema";

/**
 * Latest price snapshot per (symbol, provider).
 * Hot table — most queries are latest-by-symbol.
 */
export const marketPrices = pgTable(
  "market_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetSymbol: varchar("asset_symbol", { length: 32 })
      .notNull()
      .references(() => marketAssets.symbol, { onDelete: "cascade" }),
    price: numeric("price", { precision: 20, scale: 8 }).notNull(),
    currency: varchar("currency", { length: 8 }).notNull(),
    asOf: timestamp("as_of", { withTimezone: true }).notNull(),
    provider: marketProviderEnum("provider").notNull(),
    delayed: boolean("delayed").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("market_prices_symbol_provider_asof_uniq").on(
      table.assetSymbol,
      table.provider,
      table.asOf,
    ),
    index("market_prices_symbol_asof_idx").on(table.assetSymbol, sql`${table.asOf} DESC`),
  ],
);

/**
 * OHLCV candle storage per (symbol, interval, provider, openTime).
 */
export const marketCandles = pgTable(
  "market_candles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetSymbol: varchar("asset_symbol", { length: 32 })
      .notNull()
      .references(() => marketAssets.symbol, { onDelete: "cascade" }),
    interval: candleIntervalEnum("interval").notNull(),
    openTime: timestamp("open_time", { withTimezone: true }).notNull(),
    closeTime: timestamp("close_time", { withTimezone: true }).notNull(),
    open: numeric("open", { precision: 20, scale: 8 }).notNull(),
    high: numeric("high", { precision: 20, scale: 8 }).notNull(),
    low: numeric("low", { precision: 20, scale: 8 }).notNull(),
    close: numeric("close", { precision: 20, scale: 8 }).notNull(),
    volume: numeric("volume", { precision: 20, scale: 4 }),
    provider: marketProviderEnum("provider").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("market_candles_symbol_interval_open_provider_uniq").on(
      table.assetSymbol,
      table.interval,
      table.openTime,
      table.provider,
    ),
    index("market_candles_lookup_idx").on(
      table.assetSymbol,
      table.interval,
      sql`${table.openTime} DESC`,
    ),
  ],
);

/**
 * FX rate snapshot per (base, quote, provider, asOf). Primary provider: TCMB.
 */
export const marketFxRates = pgTable(
  "market_fx_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    baseCurrency: varchar("base_currency", { length: 8 }).notNull(),
    quoteCurrency: varchar("quote_currency", { length: 8 }).notNull(),
    rate: numeric("rate", { precision: 20, scale: 8 }).notNull(),
    asOf: timestamp("as_of", { withTimezone: true }).notNull(),
    provider: marketProviderEnum("provider").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("market_fx_rates_base_quote_asof_provider_uniq").on(
      table.baseCurrency,
      table.quoteCurrency,
      table.asOf,
      table.provider,
    ),
    index("market_fx_rates_lookup_idx").on(
      table.baseCurrency,
      table.quoteCurrency,
      sql`${table.asOf} DESC`,
    ),
  ],
);

// keep this blank — types below
export type MarketPrice = typeof marketPrices.$inferSelect;
export type NewMarketPrice = typeof marketPrices.$inferInsert;
export type MarketCandle = typeof marketCandles.$inferSelect;
export type NewMarketCandle = typeof marketCandles.$inferInsert;
export type MarketFxRate = typeof marketFxRates.$inferSelect;
export type NewMarketFxRate = typeof marketFxRates.$inferInsert;
