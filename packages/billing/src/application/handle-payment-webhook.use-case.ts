/**
 * Translate a verified webhook event into a subscription state
 * update.
 *
 * `verify` is performed by `IWebhookVerifier`; this use case
 * assumes the caller has already validated the signature. We
 * still re-check status mapping errors here so a malformed event
 * doesn't poison the DB.
 *
 * Event types handled:
 *   - `customer.subscription.created` / `.updated` → status sync
 *   - `customer.subscription.deleted` → status = canceled
 *   - `invoice.payment_succeeded` → no DB change (handled by
 *     monthly grant cron)
 *   - `invoice.payment_failed` → status = past_due
 */
import { type Result, err, ok } from "@openbulls/shared";

import { BillingError, WebhookSignatureError } from "../domain/errors";
import type { ISubscriptionRepository } from "../domain/ports/subscription.port";
import type { IWebhookVerifier } from "../domain/ports/webhook.port";

export interface HandlePaymentWebhookDeps {
  subscriptions: ISubscriptionRepository;
  webhooks: IWebhookVerifier;
}

export interface HandlePaymentWebhookInput {
  provider: "stripe" | "iyzico";
  rawBody: string;
  signature: string;
  /**
   * Parsed event payload. The webhook handler in the web app
   * is responsible for JSON.parse + provider-specific shape
   * mapping; here we receive a normalized shape.
   */
  event: NormalizedWebhookEvent;
}

export interface NormalizedWebhookEvent {
  type:
    | "subscription.created"
    | "subscription.updated"
    | "subscription.deleted"
    | "invoice.payment_succeeded"
    | "invoice.payment_failed";
  providerSubscriptionId: string;
  status?: "active" | "trialing" | "past_due" | "canceled" | "paused";
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
}

export type HandlePaymentWebhookResult = Result<
  { subscriptionId: string; status: string },
  WebhookSignatureError | BillingError
>;

export async function handlePaymentWebhook(
  deps: HandlePaymentWebhookDeps,
  input: HandlePaymentWebhookInput,
): Promise<HandlePaymentWebhookResult> {
  if (deps.webhooks.provider !== input.provider) {
    return err(new WebhookSignatureError(input.provider));
  }
  const verified = deps.webhooks.verify({
    rawBody: input.rawBody,
    signature: input.signature,
  });
  if (!verified) {
    return err(new WebhookSignatureError(input.provider));
  }

  const sub = await deps.subscriptions.getByExternalId(
    input.provider,
    input.event.providerSubscriptionId,
  );
  if (!sub) {
    return err(
      new BillingError(
        `subscription not found for external id ${input.event.providerSubscriptionId}`,
      ),
    );
  }

  let newStatus = sub.status;
  let cancelAtPeriodEnd = sub.cancelAtPeriodEnd;
  const update: {
    id: string;
    status: typeof sub.status;
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean;
  } = { id: sub.id, status: sub.status };

  switch (input.event.type) {
    case "subscription.created":
    case "subscription.updated":
      if (input.event.status) {
        newStatus = input.event.status;
        update.status = input.event.status;
      }
      break;
    case "subscription.deleted":
      newStatus = "canceled";
      update.status = "canceled";
      cancelAtPeriodEnd = false;
      update.cancelAtPeriodEnd = false;
      break;
    case "invoice.payment_succeeded":
      if (sub.status === "past_due") {
        newStatus = "active";
        update.status = "active";
      }
      break;
    case "invoice.payment_failed":
      newStatus = "past_due";
      update.status = "past_due";
      break;
  }

  if (input.event.currentPeriodStart !== undefined) {
    update.currentPeriodStart = input.event.currentPeriodStart;
  }
  if (input.event.currentPeriodEnd !== undefined) {
    update.currentPeriodEnd = input.event.currentPeriodEnd;
  }

  const updated = await deps.subscriptions.updateStatus(update);
  return ok({ subscriptionId: updated.id, status: updated.status });
}
