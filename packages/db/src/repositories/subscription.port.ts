import type { DatabaseOrTx } from "../client";
import type { PaymentProvider, Subscription, SubscriptionStatus } from "../schema/billing.schema";

export interface CreateSubscriptionInput {
  userId: string;
  planId: string;
  provider: PaymentProvider;
  status: SubscriptionStatus;
  externalSubscriptionId?: string | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
}

export interface UpdateSubscriptionStatusInput {
  id: string;
  status: SubscriptionStatus;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
}

/**
 * Subscription lifecycle persistence. Webhook handlers update
 * `status` and `current_period_*` columns as Stripe / Iyzico push
 * events; use cases update via `updateStatus`.
 */
export interface ISubscriptionRepository {
  create(input: CreateSubscriptionInput, tx?: DatabaseOrTx): Promise<Subscription>;
  updateStatus(input: UpdateSubscriptionStatusInput, tx?: DatabaseOrTx): Promise<Subscription>;
  getById(id: string): Promise<Subscription | null>;
  getByExternalId(
    provider: PaymentProvider,
    externalSubscriptionId: string,
  ): Promise<Subscription | null>;
  /** Returns the user's currently-active subscription, if any. */
  getActiveByUser(userId: string): Promise<Subscription | null>;
  listByUser(userId: string): Promise<Subscription[]>;
}
