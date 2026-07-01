/**
 * Subscribe a user to a plan.
 *
 * Flow:
 *   1. Look up the plan; reject if inactive.
 *   2. Reject if user already has an active subscription.
 *   3. Call payment gateway → external subscription ID.
 *   4. Persist subscription row (status from gateway response).
 *   5. Grant initial plan credits.
 *
 * Initial credit grant is best-effort: a failure there does NOT
 * roll back the subscription (the user is paid; the credit grant
 * can be retried by an admin).
 */
import type { DB } from "@openbulls/db/client";
import type { PaymentProvider, Plan } from "@openbulls/db/schema";
import { type Result, err, ok } from "@openbulls/shared";

import {
  AlreadySubscribedError,
  BillingError,
  PaymentFailedError,
  PlanNotFoundError,
} from "../domain/errors";
import type { ILedgerRepository } from "../domain/ports/ledger.port";
import type {
  BillingSubscriptionResult,
  IPaymentGateway,
} from "../domain/ports/payment-gateway.port";
import type { IPlanRepository } from "../domain/ports/plan.port";
import type { ISubscriptionRepository } from "../domain/ports/subscription.port";
import type { IWalletRepository } from "../domain/ports/wallet.port";

import { grantPlanCredits } from "./grant-plan-credits.use-case";

export interface SubscribeToPlanDeps {
  plans: IPlanRepository;
  subscriptions: ISubscriptionRepository;
  payments: IPaymentGateway;
  ledger: ILedgerRepository;
  wallet: IWalletRepository;
  db: DB;
}

export interface SubscribeToPlanInput {
  userId: string;
  planCode: string;
  provider: PaymentProvider;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export type SubscribeToPlanResult = Result<
  {
    subscriptionId: string;
    externalSubscriptionId: string;
    status: string;
    grantedCredits: string | null;
  },
  PlanNotFoundError | PaymentFailedError | AlreadySubscribedError | BillingError
>;

export async function subscribeToPlan(
  deps: SubscribeToPlanDeps,
  input: SubscribeToPlanInput,
): Promise<SubscribeToPlanResult> {
  const plan = await deps.plans.getByCode(input.planCode);
  if (!plan || !plan.isActive) {
    return err(new PlanNotFoundError(input.planCode));
  }

  const existing = await deps.subscriptions.getActiveByUser(input.userId);
  if (existing) {
    return err(new AlreadySubscribedError(input.userId));
  }

  const externalId = pickExternalId(plan, input.provider);
  if (!externalId) {
    return err(
      new BillingError(`plan ${input.planCode} has no external id for provider ${input.provider}`),
    );
  }

  const gatewayRequest: Parameters<IPaymentGateway["createSubscription"]>[0] = {
    userId: input.userId,
    planCode: plan.code,
    planExternalId: externalId,
    provider: input.provider,
  };
  if (input.customerEmail !== undefined) {
    gatewayRequest.customerEmail = input.customerEmail;
  }
  if (input.metadata !== undefined) {
    gatewayRequest.metadata = input.metadata;
  }

  let gatewayResult: BillingSubscriptionResult;
  try {
    gatewayResult = await deps.payments.createSubscription(gatewayRequest);
  } catch (e) {
    return err(
      new PaymentFailedError({
        message: e instanceof Error ? e.message : "unknown error",
      }),
    );
  }

  const subscription = await deps.subscriptions.create({
    userId: input.userId,
    planId: plan.id,
    provider: input.provider,
    status: gatewayResult.status === "active" ? "active" : "trialing",
    externalSubscriptionId: gatewayResult.externalSubscriptionId,
    currentPeriodStart: gatewayResult.currentPeriodStart ?? null,
    currentPeriodEnd: gatewayResult.currentPeriodEnd ?? null,
  });

  let grantedCredits: string | null = null;
  const grantResult = await grantPlanCredits(
    { db: deps.db, plans: deps.plans, ledger: deps.ledger, wallet: deps.wallet },
    { userId: input.userId, planCode: plan.code, notes: "initial grant" },
  );
  if (grantResult.ok) {
    grantedCredits = grantResult.value.granted;
  }

  return ok({
    subscriptionId: subscription.id,
    externalSubscriptionId: gatewayResult.externalSubscriptionId,
    status: subscription.status,
    grantedCredits,
  });
}

function pickExternalId(plan: Plan, provider: PaymentProvider): string | null {
  if (provider === "stripe") return plan.stripePriceId;
  if (provider === "iyzico") return plan.iyzicoPlanId;
  return null;
}
