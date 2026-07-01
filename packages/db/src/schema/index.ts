/**
 * Schema barrel — re-exports every pgTable + pgEnum in FK dependency order.
 *
 * IMPORTANT: Order matters. A table that references another must come AFTER
 * the table it references, otherwise Drizzle's relation resolver will see
 * undefined references. Cycle-breaking is done via `set null` FKs and
 * deferred table creation in drizzle-kit.
 *
 * 1. enums         → pgEnum declarations (referenced by column types)
 * 2. auth          → user (everything FKs into user.id)
 * 3. market-assets → market_assets (referenced by all market-data tables)
 * 4. market-data   → market_assets
 * 5. market-financial → market_assets
 * 6. market-technical → market_assets
 * 7. market-news   → market_assets
 * 8. portfolio     → user + market_assets
 * 9. ai            → user (chat, agent runs, steps, tools, usage, snapshots)
 * 10. billing      → user + ai
 * 11. automation   → user + ai
 * 12. notifications → user + ai
 * 13. reports      → user + portfolio + ai
 * 14. integrations → user
 */

export * from "./enums";
export * from "./auth.schema";
export * from "./market-assets.schema";
export * from "./market-data.schema";
export * from "./market-financial.schema";
export * from "./market-technical.schema";
export * from "./market-news.schema";
export * from "./portfolio.schema";
export * from "./ai.schema";
export * from "./billing.schema";
export * from "./automation.schema";
export * from "./notifications.schema";
export * from "./reports.schema";
export * from "./integrations.schema";
