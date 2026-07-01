/**
 * @openbulls/billing — public barrel.
 *
 * Consumers (apps/web, apps/cron, apps/agent-worker, packages/agent-runtime)
 * import everything from this entry point. Internal implementation
 * details stay inside their respective subpaths.
 *
 * Layered export order:
 *   1. Domain primitives — credits arithmetic, pricing math
 *   2. Domain errors — typed Result<T, BillingError>
 *   3. Domain ports — repository / gateway interfaces
 *   4. Application services — use cases (bound form via composition)
 *   5. Composition root — DI factories
 */

// --- 1. Domain primitives ---------------------------------------------

export { credits, type CreditsHelper } from "./domain/credits";
export {
  calculateUsageCost,
  type PricingCalculation,
  type PricingRow,
  type PricingInput,
} from "./domain/pricing";

// --- 2. Domain errors -------------------------------------------------

export {
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

// --- 3. Domain ports (typed contracts) --------------------------------

export type { ICreditReservationRepository } from "./domain/ports/credit-reservation.port";
export type { ILedgerRepository } from "./domain/ports/ledger.port";
export type {
  IPaymentGateway,
  CreateSubscriptionRequest,
  BillingSubscriptionResult,
  CancelSubscriptionRequest,
  BillingPaymentResult,
} from "./domain/ports/payment-gateway.port";
export type { IPlanRepository } from "./domain/ports/plan.port";
export type { IPricingCatalog } from "./domain/ports/pricing.port";
export type { ISubscriptionRepository } from "./domain/ports/subscription.port";
export type { IUsageEventRepository } from "./domain/ports/usage-event.port";
export type { IWalletRepository } from "./domain/ports/wallet.port";
export type {
  IWebhookVerifier,
  VerifyWebhookInput,
  Provider,
} from "./domain/ports/webhook.port";

// --- 4. Application use cases (function exports) ---------------------

export { reserveCredits } from "./application/reserve-credits.use-case";
export type {
  ReserveCreditsInput,
  ReserveCreditsResult,
  ReserveCreditsDeps,
} from "./application/reserve-credits.use-case";

export { finalizeUsage } from "./application/finalize-usage.use-case";
export type {
  FinalizeUsageInput,
  FinalizeUsageResult,
  FinalizeUsageDeps,
} from "./application/finalize-usage.use-case";

export { refundReservation } from "./application/refund-reservation.use-case";
export type {
  RefundReservationInput,
  RefundReservationResult,
  RefundReservationDeps,
} from "./application/refund-reservation.use-case";

export { grantPlanCredits } from "./application/grant-plan-credits.use-case";
export type {
  GrantPlanCreditsInput,
  GrantPlanCreditsResult,
  GrantPlanCreditsDeps,
} from "./application/grant-plan-credits.use-case";

export { recordUsageEvent } from "./application/record-usage-event.use-case";
export type {
  RecordUsageEventInput,
  RecordUsageEventResult,
  RecordUsageEventDeps,
} from "./application/record-usage-event.use-case";

export { subscribeToPlan } from "./application/subscribe-to-plan.use-case";
export type {
  SubscribeToPlanInput,
  SubscribeToPlanResult,
  SubscribeToPlanDeps,
} from "./application/subscribe-to-plan.use-case";

export { cancelSubscription } from "./application/cancel-subscription.use-case";
export type {
  CancelSubscriptionInput,
  CancelSubscriptionResult,
  CancelSubscriptionDeps,
} from "./application/cancel-subscription.use-case";

export { handlePaymentWebhook } from "./application/handle-payment-webhook.use-case";
export type {
  HandlePaymentWebhookInput,
  HandlePaymentWebhookResult,
  HandlePaymentWebhookDeps,
  NormalizedWebhookEvent,
} from "./application/handle-payment-webhook.use-case";

export { getWalletBalance } from "./application/get-wallet-balance.query";
export type {
  GetWalletBalanceInput,
  GetWalletBalanceResult,
  GetWalletBalanceDeps,
} from "./application/get-wallet-balance.query";

export { listPlans } from "./application/list-plans.query";
export type { ListPlansResult, ListPlansDeps } from "./application/list-plans.query";

export { getActiveSubscription } from "./application/get-active-subscription.query";
export type {
  GetActiveSubscriptionInput,
  GetActiveSubscriptionResult,
  GetActiveSubscriptionDeps,
} from "./application/get-active-subscription.query";

// --- 5. Composition root (DI factories) ------------------------------

export {
  createBillingServices,
  createBillingServicesFromDb,
} from "./infrastructure/composition";
export type {
  BillingDeps,
  BillingServices,
} from "./infrastructure/billing.types";
export type { CreateBillingServicesFromDbOptions } from "./infrastructure/composition";
