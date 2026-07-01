import { eq } from "drizzle-orm";

import type { DatabaseOrTx } from "../client";
import {
  type BillingCreditReservation,
  type ReservationStatus,
  billingCreditReservations,
} from "../schema/billing.schema";
import type {
  CreateReservationInput,
  ICreditReservationRepository,
  UpdateReservationInput,
} from "./credit-reservation.port";

/**
 * Drizzle adapter for `billing_credit_reservations`. Single-table
 * adapter — ledger writes are not its concern (see
 * `DrizzleLedgerRepository`).
 */
export class DrizzleCreditReservationRepository implements ICreditReservationRepository {
  constructor(private readonly db: DatabaseOrTx) {}

  async create(
    input: CreateReservationInput,
    tx?: DatabaseOrTx,
  ): Promise<BillingCreditReservation> {
    const conn = tx ?? this.db;
    const rows = await conn
      .insert(billingCreditReservations)
      .values({
        userId: input.userId,
        runId: input.runId ?? null,
        reservedAmount: input.reservedAmount,
        consumedAmount: "0",
        status: "reserved",
        expiresAt: input.expiresAt,
      })
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error("failed to insert billing_credit_reservations row");
    }
    return row;
  }

  async updateStatus(
    input: UpdateReservationInput,
    tx?: DatabaseOrTx,
  ): Promise<BillingCreditReservation> {
    const conn = tx ?? this.db;
    const update: {
      status: ReservationStatus;
      updatedAt: Date;
      consumedAmount?: string;
    } = {
      status: input.status,
      updatedAt: new Date(),
    };
    if (input.consumedAmount !== undefined) {
      update.consumedAmount = input.consumedAmount;
    }
    const rows = await conn
      .update(billingCreditReservations)
      .set(update)
      .where(eq(billingCreditReservations.id, input.id))
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error(`reservation not found: ${input.id}`);
    }
    return row;
  }

  getById(id: string) {
    return this.db.query.billingCreditReservations
      .findFirst({ where: eq(billingCreditReservations.id, id) })
      .then((r) => r ?? null);
  }

  getByRunId(runId: string) {
    return this.db.query.billingCreditReservations
      .findFirst({ where: eq(billingCreditReservations.runId, runId) })
      .then((r) => r ?? null);
  }
}
