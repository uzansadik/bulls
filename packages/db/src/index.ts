/**
 * @openbulls/db — barrel export.
 *
 * Consumers should import from sub-paths to keep tree-shaking tight:
 *   import { db, withTransaction } from "@openbulls/db/client";
 *   import * as schema from "@openbulls/db/schema";
 *   import { plans, subscriptions } from "@openbulls/db/schema/billing.schema";
 *
 * Domain packages import repository port interfaces and input
 * shapes from here — never the adapter classes. The full
 * `Repositories` aggregate + adapter classes are exported from
 * `@openbulls/db/repositories` for callers that need DI wiring
 * (typically app composition roots).
 */

export * from "./client";
export * as schema from "./schema";
export * from "./schema";
export type {
  IAgentRunRepository,
  CreateAgentRunInput,
  UpdateAgentRunStatusInput,
  RecordStepInput,
  MarkStepFinishedInput,
  RecordToolCallInput,
  MarkToolCallFinishedInput,
  RecordAiUsageEventInput,
  SaveGraphSnapshotInput,
} from "./repositories/agent-run.port";
export type {
  ICreditReservationRepository,
  CreateReservationInput,
  UpdateReservationInput,
} from "./repositories/credit-reservation.port";
export type { ILedgerRepository, AppendLedgerInput } from "./repositories/ledger.port";
export type { IWalletRepository } from "./repositories/wallet.port";
export type { IUsageEventRepository, RecordUsageEventInput } from "./repositories/usage-event.port";
export type {
  ISubscriptionRepository,
  CreateSubscriptionInput,
  UpdateSubscriptionStatusInput,
} from "./repositories/subscription.port";
export type { IPlanRepository } from "./repositories/plan.port";
export type { IPricingCatalog } from "./repositories/pricing.port";
export type {
  IPortfolioRepository,
  AddTransactionInput,
  CreatePortfolioInput,
  ListTransactionsQuery,
  UpsertHoldingInput,
} from "./repositories/portfolio.port";
export type { IMarketAssetRepository, UpsertMarketAssetInput } from "./repositories/market-asset.port";
