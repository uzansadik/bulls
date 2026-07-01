import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { marketProviderEnum, statementTypeEnum } from "./enums";
import { marketAssets } from "./market-assets.schema";

/**
 * Quarterly / annual financial statements (balance sheet, P&L, cash flow).
 * `rawData` keeps the provider payload (untouched) for auditability;
 * normalized projections belong in the analytics package.
 */
export const marketFinancialStatements = pgTable(
  "market_financial_statements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetSymbol: varchar("asset_symbol", { length: 32 })
      .notNull()
      .references(() => marketAssets.symbol, { onDelete: "cascade" }),
    statementType: statementTypeEnum("statement_type").notNull(),
    period: varchar("period", { length: 16 }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    fiscalYear: integer("fiscal_year").notNull(),
    currency: varchar("currency", { length: 8 }).notNull(),
    rawData: jsonb("raw_data").notNull(),
    provider: marketProviderEnum("provider").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("market_financial_statements_symbol_type_period_provider_uniq").on(
      table.assetSymbol,
      table.statementType,
      table.period,
      table.provider,
    ),
    index("market_financial_statements_lookup_idx").on(
      table.assetSymbol,
      table.statementType,
      sql`${table.periodEnd} DESC`,
    ),
  ],
);

/**
 * Computed financial ratios (P/E, ROE, debt/equity, …) per period.
 * `ratios` is a flexible jsonb blob — schema varies by provider.
 */
export const marketFinancialRatios = pgTable(
  "market_financial_ratios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetSymbol: varchar("asset_symbol", { length: 32 })
      .notNull()
      .references(() => marketAssets.symbol, { onDelete: "cascade" }),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    ratios: jsonb("ratios").notNull(),
    provider: marketProviderEnum("provider").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("market_financial_ratios_symbol_period_provider_uniq").on(
      table.assetSymbol,
      table.periodEnd,
      table.provider,
    ),
    index("market_financial_ratios_lookup_idx").on(table.assetSymbol, sql`${table.periodEnd} DESC`),
  ],
);

export type MarketFinancialStatement = typeof marketFinancialStatements.$inferSelect;
export type NewMarketFinancialStatement = typeof marketFinancialStatements.$inferInsert;
export type MarketFinancialRatio = typeof marketFinancialRatios.$inferSelect;
export type NewMarketFinancialRatio = typeof marketFinancialRatios.$inferInsert;
