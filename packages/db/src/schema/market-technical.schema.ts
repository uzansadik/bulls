import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { candleIntervalEnum, marketProviderEnum, technicalIndicatorTypeEnum } from "./enums";
import { marketAssets } from "./market-assets.schema";

/**
 * Technical indicator cache. `params` keeps the input parameters
 * (period, fastPeriod, slowPeriod…) so the same indicator can have
 * multiple variants per asset.
 */
export const marketTechnicalIndicators = pgTable(
  "market_technical_indicators",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetSymbol: varchar("asset_symbol", { length: 32 })
      .notNull()
      .references(() => marketAssets.symbol, { onDelete: "cascade" }),
    indicatorType: technicalIndicatorTypeEnum("indicator_type").notNull(),
    interval: candleIntervalEnum("interval").notNull(),
    asOf: timestamp("as_of", { withTimezone: true }).notNull(),
    params: jsonb("params").notNull().default({}),
    value: numeric("value", { precision: 20, scale: 8 }),
    series: jsonb("series"),
    provider: marketProviderEnum("provider").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("market_technical_indicators_symbol_type_interval_asof_params_uniq").on(
      table.assetSymbol,
      table.indicatorType,
      table.interval,
      table.asOf,
      table.params,
    ),
    index("market_technical_indicators_lookup_idx").on(
      table.assetSymbol,
      table.indicatorType,
      sql`${table.asOf} DESC`,
    ),
  ],
);

export type MarketTechnicalIndicator = typeof marketTechnicalIndicators.$inferSelect;
export type NewMarketTechnicalIndicator = typeof marketTechnicalIndicators.$inferInsert;
