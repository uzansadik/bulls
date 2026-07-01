import { desc, eq } from "drizzle-orm";

import type { DatabaseOrTx } from "../client";
import { billingUsageEvents } from "../schema/billing.schema";
import type { IUsageEventRepository, RecordUsageEventInput } from "./usage-event.port";

/**
 * Per-call usage line items. One reservation typically has many
 * events (one per LLM call inside the agent run); `listByReservation`
 * is what the finalize use case reads to compute total consumption.
 */
export class DrizzleUsageEventRepository implements IUsageEventRepository {
  constructor(private readonly db: DatabaseOrTx) {}

  async record(input: RecordUsageEventInput, tx?: DatabaseOrTx) {
    const conn = tx ?? this.db;
    const rows = await conn
      .insert(billingUsageEvents)
      .values({
        userId: input.userId,
        reservationId: input.reservationId ?? null,
        runId: input.runId ?? null,
        stepId: input.stepId ?? null,
        modelKey: input.modelKey,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        costAmount: input.costAmount,
        creditsCharged: input.creditsCharged,
      })
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error("failed to insert billing_usage_events row");
    }
    return row;
  }

  async listByReservation(reservationId: string) {
    return this.db
      .select()
      .from(billingUsageEvents)
      .where(eq(billingUsageEvents.reservationId, reservationId))
      .orderBy(desc(billingUsageEvents.occurredAt));
  }

  async listByRun(runId: string) {
    return this.db
      .select()
      .from(billingUsageEvents)
      .where(eq(billingUsageEvents.runId, runId))
      .orderBy(desc(billingUsageEvents.occurredAt));
  }

  async listByUser(userId: string, limit = 100) {
    return this.db
      .select()
      .from(billingUsageEvents)
      .where(eq(billingUsageEvents.userId, userId))
      .orderBy(desc(billingUsageEvents.occurredAt))
      .limit(limit);
  }
}
