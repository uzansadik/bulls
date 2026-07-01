/**
 * Fetch the user's currently-active subscription, if any.
 */
import { type Result, ok } from "@openbulls/shared";

import type { Subscription } from "@openbulls/db/schema";
import type { BillingError } from "../domain/errors";
import type { ISubscriptionRepository } from "../domain/ports/subscription.port";

export interface GetActiveSubscriptionDeps {
  subscriptions: ISubscriptionRepository;
}

export interface GetActiveSubscriptionInput {
  userId: string;
}

export type GetActiveSubscriptionResult = Result<Subscription | null, BillingError>;

export async function getActiveSubscription(
  deps: GetActiveSubscriptionDeps,
  input: GetActiveSubscriptionInput,
): Promise<GetActiveSubscriptionResult> {
  const sub = await deps.subscriptions.getActiveByUser(input.userId);
  return ok(sub);
}
