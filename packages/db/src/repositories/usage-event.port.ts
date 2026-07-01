import type { DatabaseOrTx } from "../client";
import type { BillingUsageEvent } from "../schema/billing.schema";

/**
 * Per-call usage line items written by the AI agent runtime as a step
 * completes. Each event records the model used, token counts, and the
 * resulting credit charge.
 *
 * One reservation may fan out to multiple usage events (e.g. one
 * reservation, several LLM calls within the same agent run).
 */
export interface RecordUsageEventInput {
  userId: string;
  reservationId?: string | null;
  runId?: string | null;
  stepId?: string | null;
  modelKey: string;
  inputTokens: number;
  outputTokens: number;
  /** Base cost (USD or model-currency), pre-markup. */
  costAmount: string;
  /** Credit delta applied to the user (post-markup). */
  creditsCharged: string;
}

export interface IUsageEventRepository {
  record(input: RecordUsageEventInput, tx?: DatabaseOrTx): Promise<BillingUsageEvent>;
  listByReservation(reservationId: string): Promise<BillingUsageEvent[]>;
  listByRun(runId: string): Promise<BillingUsageEvent[]>;
  listByUser(userId: string, limit?: number): Promise<BillingUsageEvent[]>;
}
