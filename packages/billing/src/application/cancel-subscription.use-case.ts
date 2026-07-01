/**
 * Cancel a user's active subscription.
 *
 * Flow:
 *   1. Look up the subscription.
 *   2. Call payment gateway to cancel (at period end or
 *      immediately, per `atPeriodEnd` flag).
 *   3. Update local subscription row.
 */
import { type Result, err, ok } from "@openbulls/shared";

import { BillingError, ReservationNotFoundError } from "../domain/errors";
import type { IPaymentGateway } from "../domain/ports/payment-gateway.port";
import type { ISubscriptionRepository } from "../domain/ports/subscription.port";

export interface CancelSubscriptionDeps {
  subscriptions: ISubscriptionRepository;
  payments: IPaymentGateway;
}

export interface CancelSubscriptionInput {
  subscriptionId: string;
  atPeriodEnd: boolean;
}

export type CancelSubscriptionResult = Result<
  { subscriptionId: string; status: string },
  ReservationNotFoundError | BillingError
>;

export async function cancelSubscription(
  deps: CancelSubscriptionDeps,
  input: CancelSubscriptionInput,
): Promise<CancelSubscriptionResult> {
  const sub = await deps.subscriptions.getById(input.subscriptionId);
  if (!sub) {
    return err(new ReservationNotFoundError(input.subscriptionId));
  }
  if (!sub.externalSubscriptionId) {
    return err(
      new BillingError(`subscription ${sub.id} has no external id — cannot cancel via gateway`),
    );
  }

  try {
    await deps.payments.cancelSubscription({
      externalSubscriptionId: sub.externalSubscriptionId,
      provider: sub.provider,
      atPeriodEnd: input.atPeriodEnd,
    });
  } catch (e) {
    return err(
      new BillingError(`gateway cancel failed: ${e instanceof Error ? e.message : "unknown"}`),
    );
  }

  const newStatus = input.atPeriodEnd ? sub.status : "canceled";
  const updated = await deps.subscriptions.updateStatus({
    id: sub.id,
    status: newStatus,
    cancelAtPeriodEnd: input.atPeriodEnd,
  });

  return ok({
    subscriptionId: updated.id,
    status: updated.status,
  });
}
