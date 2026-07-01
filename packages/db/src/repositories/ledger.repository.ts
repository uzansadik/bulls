import { desc, eq } from "drizzle-orm";

import type { DatabaseOrTx } from "../client";
import { billingCreditTransactions } from "../schema/billing.schema";
import type { AppendLedgerInput, ILedgerRepository } from "./ledger.port";

/**
 * Append-only ledger. Each call inserts one row — there is no update
 * path. `listByUser` orders DESC by `created_at` so consumers can
 * fetch the most-recent N entries without a separate sort.
 */
export class DrizzleLedgerRepository implements ILedgerRepository {
  constructor(private readonly db: DatabaseOrTx) {}

  async append(input: AppendLedgerInput, tx?: DatabaseOrTx) {
    const conn = tx ?? this.db;
    const rows = await conn
      .insert(billingCreditTransactions)
      .values({
        userId: input.userId,
        reservationId: input.reservationId ?? null,
        planId: input.planId ?? null,
        delta: input.delta,
        balanceAfter: input.balanceAfter,
        kind: input.kind,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        notes: input.notes ?? null,
      })
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error("failed to insert billing_credit_transactions row");
    }
    return row;
  }

  async listByUser(userId: string, limit = 50) {
    return this.db
      .select()
      .from(billingCreditTransactions)
      .where(eq(billingCreditTransactions.userId, userId))
      .orderBy(desc(billingCreditTransactions.createdAt))
      .limit(limit);
  }

  async listByReservation(reservationId: string) {
    return this.db
      .select()
      .from(billingCreditTransactions)
      .where(eq(billingCreditTransactions.reservationId, reservationId))
      .orderBy(desc(billingCreditTransactions.createdAt));
  }
}
