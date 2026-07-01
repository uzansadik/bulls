/**
 * @openbulls/billing — public entry point.
 *
 * Re-exports the use case surface plus the port types a consumer
 * (routes, AI tools, agent-runtime nodes) needs to bind to the
 * billing context. Concrete infrastructure classes are NOT
 * re-exported at the root — use the `/infrastructure` subpath
 * for adapters or `/composition` for the DI factory.
 *
 * Layering:
 *   domain/         — pure TS (errors, value objects, ports)
 *   application/    — use cases, return `Result<T, E>`
 *   infrastructure/ — Drizzle adapters + payment gateway adapters
 *   index.ts        — this barrel
 */

// ── Domain primitives ────────────────────────────────────────────────
export type {
  BillingError,
  InsufficientCreditsError,
  ReservationNotFoundError,
  ReservationExpiredError,
  PricingNotFoundError,
  PlanNotFoundError,
  AlreadySubscribedError,
  PaymentFailedError,
  WebhookSignatureError,
} from "./domain/errors";
export { credits } from "./domain/credits";
export type { CreditsHelper } from "./domain/credits";
export {
  calculateUsageCost,
  type PricingCalculation,
  type PricingInput,
  type PricingRow,
} from "./domain/pricing";

// ── Ports ────────────────────────────────────────────────────────────
export type {
  BillingSubscriptionResult,
  CancelSubscriptionRequest,
  CreateSubscriptionRequest,
  BillingPaymentResult,
  IPaymentGateway,
} from "./domain/ports/payment-gateway.port";
export type {
  VerifyWebhookInput,
  Provider,
  IWebhookVerifier,
} from "./domain/ports/webhook.port";

// ── Use cases — call-sites bind directly to these ───────────────────
// Inputs and `Result` types live next to each use-case function;
// they're also re-exported here for callers that prefer to import
// in one place.
export { reserveCredits } from "./application/reserve-credits.use-case";
export type {
  ReserveCreditsDeps,
  ReserveCreditsInput,
  ReserveCreditsResult,
} from "./application/reserve-credits.use-case";
export { finalizeUsage } from "./application/finalize-usage.use-case";
export type {
  FinalizeUsageDeps,
  FinalizeUsageInput,
  FinalizeUsageResult,
} from "./application/finalize-usage.use-case";
export { refundReservation } from "./application/refund-reservation.use-case";
export type {
  RefundReservationDeps,
  RefundReservationInput,
  RefundReservationResult,
} from "./application/refund-reservation.use-case";
export { grantPlanCredits } from "./application/grant-plan-credits.use-case";
export type {
  GrantPlanCreditsDeps,
  GrantPlanCreditsInput,
  GrantPlanCreditsResult,
} from "./application/grant-plan-credits.use-case";
export { recordUsageEvent } from "./application/record-usage-event.use-case";
export type {
  RecordUsageEventDeps,
  RecordUsageEventInput,
  RecordUsageEventResult,
} from "./application/record-usage-event.use-case";
export { subscribeToPlan } from "./application/subscribe-to-plan.use-case";
export type {
  SubscribeToPlanDeps,
  SubscribeToPlanInput,
  SubscribeToPlanResult,
} from "./application/subscribe-to-plan.use-case";
export { cancelSubscription } from "./application/cancel-subscription.use-case";
export type {
  CancelSubscriptionDeps,
  CancelSubscriptionInput,
  CancelSubscriptionResult,
} from "./application/cancel-subscription.use-case";
export { handlePaymentWebhook } from "./application/handle-payment-webhook.use-case";
export type {
  HandlePaymentWebhookDeps,
  HandlePaymentWebhookInput,
  HandlePaymentWebhookResult,
  NormalizedWebhookEvent,
} from "./application/handle-payment-webhook.use-case";
export { getWalletBalance } from "./application/get-wallet-balance.query";
export type {
  GetWalletBalanceDeps,
  GetWalletBalanceInput,
  GetWalletBalanceResult,
} from "./application/get-wallet-balance.query";
export { listPlans } from "./application/list-plans.query";
export type { ListPlansDeps, ListPlansResult } from "./application/list-plans.query";
export { getActiveSubscription } from "./application/get-active-subscription.query";
export type {
  GetActiveSubscriptionDeps,
  GetActiveSubscriptionInput,
  GetActiveSubscriptionResult,
} from "./application/get-active-subscription.query";

// ── Composition + infrastructure classes ─────────────────────────────
//
// `createBillingServicesFromDb(db, env)` is the recommended entry
// point for production wiring. For tests, use
// `createBillingServices({ ...mocked ports })`.
export {
  createBillingServices,
  createBillingServicesFromDb,
} from "./infrastructure/composition";
export type {
  BillingDeps,
  BillingServices,
} from "./infrastructure/billing.types";
export {
  StripeBillingGateway,
  StripeWebhookVerifier,
} from "./infrastructure/stripe-gateway.adapter";
export type { StripeGatewayOptions } from "./infrastructure/stripe-gateway.adapter";
export {
  IyzicoBillingGateway,
  IyzicoWebhookVerifier,
} from "./infrastructure/iyzico-gateway.adapter";
export type { IyzicoGatewayOptions } from "./infrastructure/iyzico-gateway.adapter";
export {
  billingEnv,
  requireIyzicoKeys,
  requireStripeKeys,
} from "./config";

// ── DB-backed port re-exports ───────────────────────────────────────
//
// Port interfaces live in `@openbulls/db/repositories`; we re-export
// the credit-reservation subset here so consumers can bind via
// `@openbulls/billing` alone. Other repos are imported from the db
// barrel directly.
export type {
  ICreditReservationRepository,
  CreateReservationInput,
  UpdateReservationInput,
} from "./domain/ports/credit-reservation.port";
