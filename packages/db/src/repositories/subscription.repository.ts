import { and, desc, eq } from "drizzle-orm";

import type { DatabaseOrTx } from "../client";
import {
  type PaymentProvider,
  type SubscriptionStatus,
  subscriptions,
} from "../schema/billing.schema";
import type {
  CreateSubscriptionInput,
  ISubscriptionRepository,
  UpdateSubscriptionStatusInput,
} from "./subscription.port";

/**
 * Drizzle adapter for `subscriptions`. Webhook handlers call
 * `updateStatus` after provider events (Stripe / Iyzico push).
 */
export class DrizzleSubscriptionRepository implements ISubscriptionRepository {
  constructor(private readonly db: DatabaseOrTx) {}

  async create(input: CreateSubscriptionInput, tx?: DatabaseOrTx) {
    const conn = tx ?? this.db;
    const rows = await conn
      .insert(subscriptions)
      .values({
        userId: input.userId,
        planId: input.planId,
        provider: input.provider,
        status: input.status,
        externalSubscriptionId: input.externalSubscriptionId ?? null,
        currentPeriodStart: input.currentPeriodStart ?? null,
        currentPeriodEnd: input.currentPeriodEnd ?? null,
      })
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error("failed to insert subscriptions row");
    }
    return row;
  }

  async updateStatus(input: UpdateSubscriptionStatusInput, tx?: DatabaseOrTx) {
    const conn = tx ?? this.db;
    const update: {
      status: SubscriptionStatus;
      updatedAt: Date;
      currentPeriodStart?: Date | null;
      currentPeriodEnd?: Date | null;
      cancelAtPeriodEnd?: boolean;
    } = {
      status: input.status,
      updatedAt: new Date(),
    };
    if (input.currentPeriodStart !== undefined) {
      update.currentPeriodStart = input.currentPeriodStart;
    }
    if (input.currentPeriodEnd !== undefined) {
      update.currentPeriodEnd = input.currentPeriodEnd;
    }
    if (input.cancelAtPeriodEnd !== undefined) {
      update.cancelAtPeriodEnd = input.cancelAtPeriodEnd;
    }
    const rows = await conn
      .update(subscriptions)
      .set(update)
      .where(eq(subscriptions.id, input.id))
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error(`subscription not found: ${input.id}`);
    }
    return row;
  }

  getById(id: string) {
    return this.db.query.subscriptions
      .findFirst({ where: eq(subscriptions.id, id) })
      .then((r) => r ?? null);
  }

  getByExternalId(provider: PaymentProvider, externalSubscriptionId: string) {
    return this.db.query.subscriptions
      .findFirst({
        where: and(
          eq(subscriptions.provider, provider),
          eq(subscriptions.externalSubscriptionId, externalSubscriptionId),
        ),
      })
      .then((r) => r ?? null);
  }

  getActiveByUser(userId: string) {
    return this.db.query.subscriptions
      .findFirst({
        where: and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")),
        orderBy: [desc(subscriptions.createdAt)],
      })
      .then((r) => r ?? null);
  }

  listByUser(userId: string) {
    return this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt));
  }
}
