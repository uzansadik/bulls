/**
 * @openbulls/automation — infrastructure barrel.
 *
 * Re-exports the Drizzle repositories, the default registry
 * factory, and the composition root. Application code imports
 * from `@openbulls/automation` (root barrel); internals stay
 * under their respective paths.
 */

export {
  DrizzleScheduledJobExecutionRepository,
  DrizzleUserScheduledJobRepository,
} from "./repositories/drizzle-repositories";
export type {
  IScheduledJobExecutionRepository,
  IUserScheduledJobRepository,
} from "./repositories/ports";

export {
  createAutomationServices,
  createDefaultExecutorRegistry,
} from "./composition";
export type {
  AutomationServicesHandle,
  CreateAutomationServicesInput,
} from "./composition";

export { computeNextRunAt } from "../domain/schedule";

export {
  createCustomAgentExecutor,
  createEarningsCalendarWatchExecutor,
  createNewsWatchExecutor,
  createPortfolioDailyReviewExecutor,
  createPortfolioWeeklyReviewExecutor,
  createPriceAlertExecutor,
} from "./default-executors.factory";
