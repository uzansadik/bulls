import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { aiAgentRunSteps, aiAgentRuns } from "./ai.schema";
import { user } from "./auth.schema";
import {
  creditTxKindEnum,
  paymentProviderEnum,
  reservationStatusEnum,
  subscriptionStatusEnum,
} from "./enums";

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 32 }).notNull(),
    name: text("name").notNull(),
    monthlyCredits: numeric("monthly_credits", { precision: 20, scale: 8 }).notNull(),
    pricePerMonthCents: integer("price_per_month_cents").notNull(),
    currency: varchar("currency", { length: 8 }).notNull().default("USD"),
    stripePriceId: text("stripe_price_id"),
    iyzicoPlanId: text("iyzico_plan_id"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("plans_code_uniq").on(table.code)],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    status: subscriptionStatusEnum("status").notNull(),
    provider: paymentProviderEnum("provider").notNull(),
    externalSubscriptionId: text("external_subscription_id"),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("subscriptions_user_idx").on(table.userId),
    uniqueIndex("subscriptions_provider_external_uniq").on(
      table.provider,
      table.externalSubscriptionId,
    ),
  ],
);

export const modelPricing = pgTable(
  "model_pricing",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modelKey: varchar("model_key", { length: 64 }).notNull(),
    inputCostPer1k: numeric("input_cost_per_1k", { precision: 20, scale: 8 }).notNull(),
    outputCostPer1k: numeric("output_cost_per_1k", { precision: 20, scale: 8 }).notNull(),
    markupPercent: numeric("markup_percent", { precision: 6, scale: 3 }).notNull().default("0"),
    currency: varchar("currency", { length: 8 }).notNull().default("USD"),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("model_pricing_key_uniq").on(table.modelKey),
    index("model_pricing_effective_idx").on(table.modelKey, sql`${table.effectiveFrom} DESC`),
  ],
);

export const billingCreditReservations = pgTable(
  "billing_credit_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    runId: uuid("run_id").references(() => aiAgentRuns.id, {
      onDelete: "set null",
    }),
    reservedAmount: numeric("reserved_amount", { precision: 20, scale: 8 }).notNull(),
    consumedAmount: numeric("consumed_amount", { precision: 20, scale: 8 }).notNull().default("0"),
    status: reservationStatusEnum("status").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("billing_credit_reservations_user_status_idx").on(table.userId, table.status),
    index("billing_credit_reservations_run_idx").on(table.runId),
    index("billing_credit_reservations_expires_idx").on(table.expiresAt),
  ],
);

export const billingCreditTransactions = pgTable(
  "billing_credit_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reservationId: uuid("reservation_id").references(() => billingCreditReservations.id, {
      onDelete: "set null",
    }),
    planId: uuid("plan_id").references(() => plans.id, { onDelete: "set null" }),
    delta: numeric("delta", { precision: 20, scale: 8 }).notNull(),
    balanceAfter: numeric("balance_after", { precision: 20, scale: 8 }).notNull(),
    kind: creditTxKindEnum("kind").notNull(),
    referenceType: varchar("reference_type", { length: 32 }),
    referenceId: varchar("reference_id", { length: 64 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("billing_credit_transactions_user_created_idx").on(
      table.userId,
      sql`${table.createdAt} DESC`,
    ),
    index("billing_credit_transactions_reservation_idx").on(table.reservationId),
  ],
);

export const billingUsageEvents = pgTable(
  "billing_usage_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reservationId: uuid("reservation_id").references(() => billingCreditReservations.id, {
      onDelete: "set null",
    }),
    runId: uuid("run_id").references(() => aiAgentRuns.id, {
      onDelete: "set null",
    }),
    stepId: uuid("step_id").references(() => aiAgentRunSteps.id, {
      onDelete: "set null",
    }),
    modelKey: varchar("model_key", { length: 64 }).notNull(),
    inputTokens: smallint("input_tokens").notNull().default(0),
    outputTokens: smallint("output_tokens").notNull().default(0),
    costAmount: numeric("cost_amount", { precision: 20, scale: 8 }).notNull(),
    creditsCharged: numeric("credits_charged", { precision: 20, scale: 8 }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("billing_usage_events_user_occurred_idx").on(table.userId, sql`${table.occurredAt} DESC`),
    index("billing_usage_events_reservation_idx").on(table.reservationId),
    index("billing_usage_events_run_idx").on(table.runId),
  ],
);

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type ModelPricing = typeof modelPricing.$inferSelect;
export type NewModelPricing = typeof modelPricing.$inferInsert;
export type BillingCreditReservation = typeof billingCreditReservations.$inferSelect;
export type NewBillingCreditReservation = typeof billingCreditReservations.$inferInsert;
export type BillingCreditTransaction = typeof billingCreditTransactions.$inferSelect;
export type NewBillingCreditTransaction = typeof billingCreditTransactions.$inferInsert;
export type BillingUsageEvent = typeof billingUsageEvents.$inferSelect;
export type NewBillingUsageEvent = typeof billingUsageEvents.$inferInsert;

// Re-export billing-relevant enum type aliases so consumers can import
// everything they need from `@openbulls/db/schema/billing.schema`.
export type {
  CreditTxKind,
  PaymentProvider,
  ReservationStatus,
  SubscriptionStatus,
} from "./enums";
