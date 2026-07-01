import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { user } from "./auth.schema";
import { transactionSideEnum } from "./enums";
import { marketAssets } from "./market-assets.schema";

export const portfolios = pgTable(
  "portfolios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    baseCurrency: varchar("base_currency", { length: 8 }).notNull().default("TRY"),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("portfolios_user_idx").on(table.userId)],
);

export const portfolioTransactions = pgTable(
  "portfolio_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    portfolioId: uuid("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    assetSymbol: varchar("asset_symbol", { length: 32 })
      .notNull()
      .references(() => marketAssets.symbol, { onDelete: "restrict" }),
    side: transactionSideEnum("side").notNull(),
    quantity: numeric("quantity", { precision: 20, scale: 8 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 20, scale: 8 }).notNull(),
    fees: numeric("fees", { precision: 20, scale: 8 }).notNull().default("0"),
    currency: varchar("currency", { length: 8 }).notNull(),
    executedAt: timestamp("executed_at", { withTimezone: true }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("portfolio_transactions_portfolio_executed_idx").on(
      table.portfolioId,
      sql`${table.executedAt} DESC`,
    ),
    index("portfolio_transactions_asset_idx").on(table.assetSymbol),
  ],
);

export const portfolioHoldings = pgTable(
  "portfolio_holdings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    portfolioId: uuid("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    assetSymbol: varchar("asset_symbol", { length: 32 })
      .notNull()
      .references(() => marketAssets.symbol, { onDelete: "restrict" }),
    quantity: numeric("quantity", { precision: 20, scale: 8 }).notNull(),
    avgCost: numeric("avg_cost", { precision: 20, scale: 8 }).notNull(),
    realizedPnl: numeric("realized_pnl", { precision: 20, scale: 8 }).notNull().default("0"),
    lastComputedAt: timestamp("last_computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("portfolio_holdings_portfolio_asset_uniq").on(table.portfolioId, table.assetSymbol),
    index("portfolio_holdings_portfolio_idx").on(table.portfolioId),
  ],
);

export type Portfolio = typeof portfolios.$inferSelect;
export type NewPortfolio = typeof portfolios.$inferInsert;
export type PortfolioTransaction = typeof portfolioTransactions.$inferSelect;
export type NewPortfolioTransaction = typeof portfolioTransactions.$inferInsert;
export type PortfolioHolding = typeof portfolioHoldings.$inferSelect;
export type NewPortfolioHolding = typeof portfolioHoldings.$inferInsert;
