/**
 * Record a single LLM call's usage.
 *
 * Looks up active pricing for the model, calculates the credit
 * charge, persists a `billing_usage_events` row. Idempotent at
 * the row level: callers should de-dupe upstream (a step that
 * retries will produce two events — that's intentional, the agent
 * runtime owns retry semantics).
 */
import { type Result, err, ok } from "@openbulls/shared";

import { PricingNotFoundError } from "../domain/errors";
import type { IPricingCatalog } from "../domain/ports/pricing.port";
import type { IUsageEventRepository } from "../domain/ports/usage-event.port";
import { calculateUsageCost } from "../domain/pricing";

export interface RecordUsageEventDeps {
  pricing: IPricingCatalog;
  usageEvents: IUsageEventRepository;
}

export interface RecordUsageEventInput {
  userId: string;
  reservationId?: string | null;
  runId?: string | null;
  stepId?: string | null;
  modelKey: string;
  inputTokens: number;
  outputTokens: number;
}

export type RecordUsageEventResult = Result<
  {
    usageEventId: string;
    costAmount: string;
    creditsCharged: string;
  },
  PricingNotFoundError
>;

export async function recordUsageEvent(
  deps: RecordUsageEventDeps,
  input: RecordUsageEventInput,
): Promise<RecordUsageEventResult> {
  const pricing = await deps.pricing.getActiveForModel(input.modelKey);
  if (!pricing) {
    return err(new PricingNotFoundError(input.modelKey));
  }

  const calc = calculateUsageCost({
    modelPricing: {
      inputCostPer1k: pricing.inputCostPer1k,
      outputCostPer1k: pricing.outputCostPer1k,
      markupPercent: pricing.markupPercent,
    },
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
  });

  const event = await deps.usageEvents.record({
    userId: input.userId,
    reservationId: input.reservationId ?? null,
    runId: input.runId ?? null,
    stepId: input.stepId ?? null,
    modelKey: input.modelKey,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    costAmount: calc.costAmount,
    creditsCharged: calc.creditsCharged,
  });

  return ok({
    usageEventId: event.id,
    costAmount: calc.costAmount,
    creditsCharged: calc.creditsCharged,
  });
}
