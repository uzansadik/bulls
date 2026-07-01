import { eq } from "drizzle-orm";

import { closeDb, db } from "./client";
import { user as userTable } from "./schema/auth.schema";
import { plans, subscriptions } from "./schema/billing.schema";
import { marketAssets } from "./schema/market-assets.schema";

/**
 * Default plans seeded on first migration.
 * Pricing in USD cents — credits are arbitrary units; the conversion
 * happens in the billing package (model_pricing + markup).
 */
const DEFAULT_PLANS = [
  {
    code: "free",
    name: "Free",
    monthlyCredits: "100",
    pricePerMonthCents: 0,
    currency: "USD",
  },
  {
    code: "pro",
    name: "Pro",
    monthlyCredits: "10000",
    pricePerMonthCents: 1900,
    currency: "USD",
  },
  {
    code: "business",
    name: "Business",
    monthlyCredits: "100000",
    pricePerMonthCents: 9900,
    currency: "USD",
  },
] as const;

/**
 * Seed all default plans (idempotent — onConflictDoNothing on code).
 */
export async function seedPlans(): Promise<void> {
  await db
    .insert(plans)
    .values(
      DEFAULT_PLANS.map((p) => ({
        code: p.code,
        name: p.name,
        monthlyCredits: p.monthlyCredits,
        pricePerMonthCents: p.pricePerMonthCents,
        currency: p.currency,
      })),
    )
    .onConflictDoNothing({ target: plans.code });
}

/**
 * Ensure the default free-plan subscription exists for a user.
 * Called after sign-up (or lazily on first dashboard load).
 */
export async function ensureFreeSubscription(userId: string): Promise<void> {
  const [freePlan] = await db.select().from(plans).where(eq(plans.code, "free")).limit(1);
  if (!freePlan) {
    throw new Error("free plan missing — run seedPlans() first");
  }
  await db
    .insert(subscriptions)
    .values({
      userId,
      planId: freePlan.id,
      status: "active",
      provider: "manual",
    })
    .onConflictDoNothing();
}

/**
 * Seed a small universe of well-known assets for local development.
 * Real provider syncs happen in apps/cron via packages/market-data.
 */
export async function seedMarketAssets(): Promise<void> {
  const FIXTURES = [
    { symbol: "THYAO", name: "Türk Hava Yolları", assetType: "stock", exchange: "BIST" },
    { symbol: "GARAN", name: "Garanti BBVA", assetType: "stock", exchange: "BIST" },
    { symbol: "ASELS", name: "Aselsan", assetType: "stock", exchange: "BIST" },
    { symbol: "AAPL", name: "Apple Inc.", assetType: "stock", exchange: "NASDAQ" },
    { symbol: "MSFT", name: "Microsoft Corp.", assetType: "stock", exchange: "NASDAQ" },
    { symbol: "BTC", name: "Bitcoin", assetType: "crypto", exchange: "BINANCE" },
    { symbol: "USD/TRY", name: "US Dollar / Turkish Lira", assetType: "fx", exchange: "TCMB" },
  ] as const;
  await db
    .insert(marketAssets)
    .values(
      FIXTURES.map((a) => ({
        symbol: a.symbol,
        name: a.name,
        assetType: a.assetType,
        exchange: a.exchange,
        currency: a.assetType === "fx" ? "TRY" : a.assetType === "crypto" ? "USD" : "TRY",
      })),
    )
    .onConflictDoNothing({ target: marketAssets.symbol });
}

/**
 * Full seed entry point — used by `pnpm db:seed`.
 */
export async function seedDatabase(): Promise<void> {
  await seedPlans();
  await seedMarketAssets();
  // Admin user is created by scripts/create-admin.ts separately so the
  // password is captured via CLI prompt.
  console.log("✓ seeded plans + market asset fixtures");
}

/**
 * Reset helper — drops all rows in user-owned tables.
 * Intentionally NOT exposed via package exports; only via scripts/reset-db.ts.
 */
export async function resetDatabase(): Promise<void> {
  await db.delete(marketAssets);
  await db.delete(subscriptions);
  await db.delete(plans);
  await db.delete(userTable);
  console.log("✓ database cleared");
}

/* eslint-disable @typescript-eslint/no-unused-vars */
// CLI hook: tsx scripts/seed.ts
if (import.meta.url === `file:///${process.argv[1]}`) {
  seedDatabase()
    .then(() => closeDb())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      closeDb().finally(() => process.exit(1));
    });
}
/* eslint-enable @typescript-eslint/no-unused-vars */
