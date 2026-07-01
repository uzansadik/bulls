/**
 * @openbulls/billing — composition root (DI factory).
 *
 * `createBillingServices(deps)` wires ports + adapters + use cases
 * into a single object. `createBillingServicesFromDb({ db, env })`
 * builds the standard production stack: Drizzle adapters from the
 * workspace's `@openbulls/db` aggregator + Stripe as the default
 * payment gateway.
 */
import type { DB } from "@openbulls/db/client";
import { createRepositories } from "@openbulls/db/repositories";
import type { PaymentProvider } from "@openbulls/db/schema";

import { cancelSubscription } from "../application/cancel-subscription.use-case";
import { finalizeUsage } from "../application/finalize-usage.use-case";
import { getActiveSubscription } from "../application/get-active-subscription.query";
import { getWalletBalance } from "../application/get-wallet-balance.query";
import { grantPlanCredits } from "../application/grant-plan-credits.use-case";
import { handlePaymentWebhook } from "../application/handle-payment-webhook.use-case";
import { listPlans } from "../application/list-plans.query";
import { recordUsageEvent } from "../application/record-usage-event.use-case";
import { refundReservation } from "../application/refund-reservation.use-case";
import { reserveCredits } from "../application/reserve-credits.use-case";
import { subscribeToPlan } from "../application/subscribe-to-plan.use-case";

import { requireStripeKeys } from "../config";
import type { BillingDeps, BillingServices } from "./billing.types";
import { IyzicoBillingGateway, IyzicoWebhookVerifier } from "./iyzico-gateway.adapter";
import { StripeBillingGateway, StripeWebhookVerifier } from "./stripe-gateway.adapter";

export function createBillingServices(deps: BillingDeps): BillingServices {
  return {
    reserveCredits: reserveCredits.bind(null, deps),
    finalizeUsage: finalizeUsage.bind(null, deps),
    refundReservation: refundReservation.bind(null, deps),
    grantPlanCredits: grantPlanCredits.bind(null, deps),
    recordUsageEvent: recordUsageEvent.bind(null, deps),
    subscribeToPlan: subscribeToPlan.bind(null, deps),
    cancelSubscription: cancelSubscription.bind(null, deps),
    handlePaymentWebhook: handlePaymentWebhook.bind(null, deps),
    getWalletBalance: getWalletBalance.bind(null, deps),
    listPlans: listPlans.bind(null, deps),
    getActiveSubscription: getActiveSubscription.bind(null, deps),
  };
}

export interface CreateBillingServicesFromDbOptions {
  db: DB;
  env: import("@openbulls/config").ServerEnv;
  provider?: Extract<PaymentProvider, "stripe" | "iyzico">;
}

/**
 * Production wiring — Drizzle adapters from `@openbulls/db`, Stripe
 * as default gateway. Pass `provider: "iyzico"` to swap.
 */
export function createBillingServicesFromDb(
  opts: CreateBillingServicesFromDbOptions,
): BillingServices {
  const repos = createRepositories(opts.db);

  let payments: BillingDeps["payments"];
  let webhooks: BillingDeps["webhooks"];
  if (opts.provider === "iyzico") {
    const apiKey = opts.env.IYZICO_API_KEY;
    const secretKey = opts.env.IYZICO_SECRET_KEY;
    if (!apiKey || !secretKey) {
      throw new Error("IYZICO_API_KEY and IYZICO_SECRET_KEY required");
    }
    payments = new IyzicoBillingGateway({ apiKey, secretKey });
    webhooks = new IyzicoWebhookVerifier({ apiKey, secretKey });
  } else {
    const keys = requireStripeKeys(opts.env);
    payments = new StripeBillingGateway({
      secretKey: keys.secretKey,
      webhookSecret: keys.webhookSecret,
    });
    webhooks = new StripeWebhookVerifier({
      webhookSecret: keys.webhookSecret,
    });
  }

  const deps: BillingDeps = {
    db: opts.db,
    wallet: repos.wallet,
    ledger: repos.ledger,
    reservations: repos.creditReservations,
    usageEvents: repos.usageEvents,
    subscriptions: repos.subscriptions,
    plans: repos.plans,
    pricing: repos.pricing,
    payments,
    webhooks,
  };

  return createBillingServices(deps);
}

export type { BillingDeps, BillingServices } from "./billing.types";
