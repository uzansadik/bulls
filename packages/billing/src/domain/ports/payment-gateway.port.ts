/**
 * @openbulls/billing — payment-gateway port (Stripe / Iyzico / ...).
 *
 * The hexagonal contract: the use case layer talks to this
 * interface; infrastructure adapters (`StripeBillingGateway`,
 * `IyzicoBillingGateway`) implement it. Each adapter is
 * responsible for:
 *
 *   1. Authenticating with the provider.
 *   2. Translating domain requests into provider-shaped HTTP calls.
 *   3. Parsing provider responses into the `BillingGatewayResult`
 *      and `BillingSubscriptionResult` shapes below.
 *
 * Errors thrown from these methods are infrastructure failures
 * (network, status code, JSON parse). Domain-level payment
 * failures (declined card, fraud block) are returned as
 * `PaymentFailedError` wrapped in a `Result`.
 */
import type { PaymentProvider } from "@openbulls/db/schema";

export interface CreateSubscriptionRequest {
  userId: string;
  planCode: string;
  planExternalId: string;
  provider: PaymentProvider;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export interface BillingSubscriptionResult {
  externalSubscriptionId: string;
  externalCustomerId?: string;
  status: "active" | "trialing" | "pending" | "past_due" | "canceled" | "paused";
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  provider: PaymentProvider;
}

export interface CancelSubscriptionRequest {
  externalSubscriptionId: string;
  provider: PaymentProvider;
  atPeriodEnd: boolean;
}

export interface BillingPaymentResult {
  provider: PaymentProvider;
  externalPaymentId: string;
  amountCents: number;
  currency: string;
  status: "succeeded" | "pending" | "failed";
}

export interface IPaymentGateway {
  createSubscription(req: CreateSubscriptionRequest): Promise<BillingSubscriptionResult>;
  cancelSubscription(req: CancelSubscriptionRequest): Promise<void>;
  getSubscription(
    provider: PaymentProvider,
    externalSubscriptionId: string,
  ): Promise<BillingSubscriptionResult | null>;
  /** Lightweight liveness probe used by health-checks. */
  ping(): Promise<boolean>;
}
