/**
 * @openbulls/automation — public barrel.
 *
 * Consumers (`apps/cron`, `apps/agent-worker`, future admin tools)
 * import everything from this entry point. Internal layout
 * (`domain/`, `application/`, `infrastructure/`) stays free to evolve.
 *
 * Composition shape:
 *   import {
 *     createAutomationServices,
 *     type AutomationServices,
 *   } from "@openbulls/automation";
 *   const handle = createAutomationServices({ db, jobs, ... });
 *   handle.services.dispatchDueJobs();
 */

// Domain
export * from "./domain";

// Application
export * from "./application";

// Infrastructure (re-exports selected factories + types)
export {
  DrizzleScheduledJobExecutionRepository,
  DrizzleUserScheduledJobRepository,
  createAutomationServices,
  createDefaultExecutorRegistry,
  createCustomAgentExecutor,
  createEarningsCalendarWatchExecutor,
  createNewsWatchExecutor,
  createPortfolioDailyReviewExecutor,
  createPortfolioWeeklyReviewExecutor,
  createPriceAlertExecutor,
  computeNextRunAt,
} from "./infrastructure";
export type {
  AutomationServicesHandle,
  CreateAutomationServicesInput,
  IScheduledJobExecutionRepository,
  IUserScheduledJobRepository,
} from "./infrastructure";
