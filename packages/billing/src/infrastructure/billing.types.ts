/**
 * @openbulls/billing — shared types for the composition layer.
 *
 * `BillingDeps` is the full set of ports use cases bind to. Each
 * use case declares a narrower `Pick<BillingDeps, ...>` locally so
 * unit tests can supply only the relevant mock.
 *
 * `BillingServices` is the public service surface — each entry is
 * the *bound* form of a use case (`useCase.bind(null, deps)`),
 * meaning consumers call it with the input only. This matches what
 * route handlers and AI tools actually invoke.
 */
import type { DB } from "@openbulls/db/client";
import type {
  CancelSubscriptionInput,
  CancelSubscriptionResult,
} from "../application/cancel-subscription.use-case";
import type {
  FinalizeUsageInput,
  FinalizeUsageResult,
} from "../application/finalize-usage.use-case";
import type {
  GetActiveSubscriptionInput,
  GetActiveSubscriptionResult,
} from "../application/get-active-subscription.query";
import type {
  GetWalletBalanceInput,
  GetWalletBalanceResult,
} from "../application/get-wallet-balance.query";
import type {
  GrantPlanCreditsInput,
  GrantPlanCreditsResult,
} from "../application/grant-plan-credits.use-case";
import type {
  HandlePaymentWebhookInput,
  HandlePaymentWebhookResult,
} from "../application/handle-payment-webhook.use-case";
import type { ListPlansResult } from "../application/list-plans.query";
import type {
  RecordUsageEventInput,
  RecordUsageEventResult,
} from "../application/record-usage-event.use-case";
import type {
  RefundReservationInput,
  RefundReservationResult,
} from "../application/refund-reservation.use-case";
import type {
  ReserveCreditsInput,
  ReserveCreditsResult,
} from "../application/reserve-credits.use-case";
import type {
  SubscribeToPlanInput,
  SubscribeToPlanResult,
} from "../application/subscribe-to-plan.use-case";
import type { ICreditReservationRepository } from "../domain/ports/credit-reservation.port";
import type { ILedgerRepository } from "../domain/ports/ledger.port";
import type { IPaymentGateway } from "../domain/ports/payment-gateway.port";
import type { IPlanRepository } from "../domain/ports/plan.port";
import type { IPricingCatalog } from "../domain/ports/pricing.port";
import type { ISubscriptionRepository } from "../domain/ports/subscription.port";
import type { IUsageEventRepository } from "../domain/ports/usage-event.port";
import type { IWalletRepository } from "../domain/ports/wallet.port";
import type { IWebhookVerifier } from "../domain/ports/webhook.port";

export interface BillingDeps {
  db: DB;
  wallet: IWalletRepository;
  ledger: ILedgerRepository;
  reservations: ICreditReservationRepository;
  usageEvents: IUsageEventRepository;
  subscriptions: ISubscriptionRepository;
  plans: IPlanRepository;
  pricing: IPricingCatalog;
  payments: IPaymentGateway;
  webhooks: IWebhookVerifier;
}

export interface BillingServices {
  reserveCredits: (input: ReserveCreditsInput) => Promise<ReserveCreditsResult>;
  finalizeUsage: (input: FinalizeUsageInput) => Promise<FinalizeUsageResult>;
  refundReservation: (input: RefundReservationInput) => Promise<RefundReservationResult>;
  grantPlanCredits: (input: GrantPlanCreditsInput) => Promise<GrantPlanCreditsResult>;
  recordUsageEvent: (input: RecordUsageEventInput) => Promise<RecordUsageEventResult>;
  subscribeToPlan: (input: SubscribeToPlanInput) => Promise<SubscribeToPlanResult>;
  cancelSubscription: (input: CancelSubscriptionInput) => Promise<CancelSubscriptionResult>;
  handlePaymentWebhook: (input: HandlePaymentWebhookInput) => Promise<HandlePaymentWebhookResult>;
  getWalletBalance: (input: GetWalletBalanceInput) => Promise<GetWalletBalanceResult>;
  listPlans: () => Promise<ListPlansResult>;
  getActiveSubscription: (
    input: GetActiveSubscriptionInput,
  ) => Promise<GetActiveSubscriptionResult>;
}
