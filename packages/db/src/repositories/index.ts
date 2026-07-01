import type { DB } from "../client";
import type { IAgentRunRepository } from "./agent-run.port";
import { DrizzleAgentRunRepository } from "./agent-run.repository";
import type { ICreditReservationRepository } from "./credit-reservation.port";
import { DrizzleCreditReservationRepository } from "./credit-reservation.repository";
import type { ILedgerRepository } from "./ledger.port";
import { DrizzleLedgerRepository } from "./ledger.repository";
import type { IMarketAssetRepository } from "./market-asset.port";
import { DrizzleMarketAssetRepository } from "./market-asset.repository";
import type { IPlanRepository } from "./plan.port";
import { DrizzlePlanRepository } from "./plan.repository";
import type { IPortfolioRepository } from "./portfolio.port";
import { DrizzlePortfolioRepository } from "./portfolio.repository";
import type { IPricingCatalog } from "./pricing.port";
import { DrizzlePricingRepository } from "./pricing.repository";
import type { IScheduledJobExecutionRepository } from "./scheduled-job-execution.port";
import { DrizzleScheduledJobExecutionRepository } from "./scheduled-job-execution.repository";
import type { ISubscriptionRepository } from "./subscription.port";
import { DrizzleSubscriptionRepository } from "./subscription.repository";
import type { IUsageEventRepository } from "./usage-event.port";
import { DrizzleUsageEventRepository } from "./usage-event.repository";
import type { IUserScheduledJobRepository } from "./user-scheduled-job.port";
import { DrizzleUserScheduledJobRepository } from "./user-scheduled-job.repository";
import type { IWalletRepository } from "./wallet.port";
import { DrizzleWalletRepository } from "./wallet.repository";

/**
 * Aggregate of all repositories bound to a single DB instance.
 * Add new repositories here as they're created; consumers should
 * always receive a fully-bound Repositories object rather than
 * instantiating adapters themselves.
 */
export interface Repositories {
  creditReservations: ICreditReservationRepository;
  ledger: ILedgerRepository;
  wallet: IWalletRepository;
  usageEvents: IUsageEventRepository;
  subscriptions: ISubscriptionRepository;
  plans: IPlanRepository;
  pricing: IPricingCatalog;
  agentRuns: IAgentRunRepository;
  portfolios: IPortfolioRepository;
  marketAssets: IMarketAssetRepository;
  scheduledJobs: IUserScheduledJobRepository;
  scheduledJobExecutions: IScheduledJobExecutionRepository;
}

/**
 * Factory — instantiate every repository with the same DB connection.
 * Tests can override individual fields with mocks.
 */
export function createRepositories(db: DB): Repositories {
  return {
    creditReservations: new DrizzleCreditReservationRepository(db),
    ledger: new DrizzleLedgerRepository(db),
    wallet: new DrizzleWalletRepository(db),
    usageEvents: new DrizzleUsageEventRepository(db),
    subscriptions: new DrizzleSubscriptionRepository(db),
    plans: new DrizzlePlanRepository(db),
    pricing: new DrizzlePricingRepository(db),
    agentRuns: new DrizzleAgentRunRepository(db),
    portfolios: new DrizzlePortfolioRepository(db),
    marketAssets: new DrizzleMarketAssetRepository(db),
    scheduledJobs: new DrizzleUserScheduledJobRepository(db),
    scheduledJobExecutions: new DrizzleScheduledJobExecutionRepository(db),
  };
}

// Port interfaces (re-exported for domain packages to import without
// pulling in adapter implementations).
export type { IAgentRunRepository } from "./agent-run.port";
export type {
  CreateAgentRunInput,
  UpdateAgentRunStatusInput,
  RecordStepInput,
  MarkStepFinishedInput,
  RecordToolCallInput,
  MarkToolCallFinishedInput,
  RecordAiUsageEventInput,
  SaveGraphSnapshotInput,
} from "./agent-run.port";
export type { ICreditReservationRepository } from "./credit-reservation.port";
export type {
  CreateReservationInput,
  UpdateReservationInput,
} from "./credit-reservation.port";
export type { ILedgerRepository } from "./ledger.port";
export type { AppendLedgerInput } from "./ledger.port";
export type { IWalletRepository } from "./wallet.port";
export type { IUsageEventRepository } from "./usage-event.port";
export type { RecordUsageEventInput } from "./usage-event.port";
export type { ISubscriptionRepository } from "./subscription.port";
export type {
  CreateSubscriptionInput,
  UpdateSubscriptionStatusInput,
} from "./subscription.port";
export type { IPlanRepository } from "./plan.port";
export type { IPricingCatalog } from "./pricing.port";
export type { IPortfolioRepository } from "./portfolio.port";
export type {
  AddTransactionInput,
  CreatePortfolioInput,
  ListTransactionsQuery,
  UpsertHoldingInput,
} from "./portfolio.port";
export type { IMarketAssetRepository } from "./market-asset.port";
export type { UpsertMarketAssetInput } from "./market-asset.port";
export type { IUserScheduledJobRepository } from "./user-scheduled-job.port";
export type { IScheduledJobExecutionRepository } from "./scheduled-job-execution.port";

// Adapter classes (advanced: only used in tests or custom DI setups).
export {
  DrizzleAgentRunRepository,
  DrizzleCreditReservationRepository,
  DrizzleLedgerRepository,
  DrizzleMarketAssetRepository,
  DrizzlePlanRepository,
  DrizzlePortfolioRepository,
  DrizzlePricingRepository,
  DrizzleScheduledJobExecutionRepository,
  DrizzleSubscriptionRepository,
  DrizzleUsageEventRepository,
  DrizzleUserScheduledJobRepository,
  DrizzleWalletRepository,
};
