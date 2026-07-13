/**
 * @openbulls/automation — default executor registry factory.
 *
 * Registers all 7 built-in executors against a fresh
 * `InMemoryExecutorRegistry`. The cron process and the agent-worker
 * process both call this at boot — same set, same wiring, identical
 * registry in both runtimes.
 *
 * Why two processes share the registry: the cron process dispatches
 * (calls `buildPayload` and enqueues), the agent-worker handler
 * executes (calls `run`). Both need the same `IExecutor` instances
 * (registered under the same `type`) so the contract round-trips.
 *
 * Note: `price_alert` is only registered when a `marketData` gateway
 * is supplied. Bootstrapping without market data (e.g. cron-only dev
 * runs) skips that executor; its rows are marked `skipped` with
 * `executor_not_registered`.
 */
import type { IMarketDataGateway } from "@openbulls/agent-runtime";
import type { JobsServices } from "@openbulls/jobs";

import { type IExecutorRegistry, InMemoryExecutorRegistry } from "../application/executor-registry";

import {
  createCustomAgentExecutor,
  createEarningsCalendarWatchExecutor,
  createNewsWatchExecutor,
  createPortfolioDailyReviewExecutor,
  createPortfolioWeeklyReviewExecutor,
  createPriceAlertExecutor,
  createReportRenderExecutor,
} from "./default-executors.factory";

export interface CreateDefaultExecutorRegistryInput {
  readonly jobs: JobsServices;
  readonly marketData?: IMarketDataGateway;
}

export function createDefaultExecutorRegistry(
  input: CreateDefaultExecutorRegistryInput,
): IExecutorRegistry {
  const registry = new InMemoryExecutorRegistry();
  registry.register(createCustomAgentExecutor(input));
  registry.register(createPortfolioDailyReviewExecutor(input));
  registry.register(createPortfolioWeeklyReviewExecutor(input));
  registry.register(createNewsWatchExecutor(input));
  registry.register(createEarningsCalendarWatchExecutor(input));
  registry.register(createReportRenderExecutor(input));
  if (input.marketData) {
    registry.register(createPriceAlertExecutor({ jobs: input.jobs, marketData: input.marketData }));
  }
  return registry;
}
