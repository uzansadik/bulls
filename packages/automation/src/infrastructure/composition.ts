/**
 * @openbulls/automation — composition root.
 *
 * `createAutomationServices` builds a fully-bound `AutomationServices`
 * from the same shape of dependencies the cron process and the
 * agent-worker pass in. Tests use the same factory with mocks so
 * production wiring stays the only place that touches Drizzle.
 *
 * Returned services include both the registry/repositories (so
 * `apps/agent-worker` can register handlers that look up executors)
 * and the dispatch commands (so `apps/cron` can run them per tick).
 */
import { randomUUID } from "node:crypto";

import type { DatabaseOrTx } from "@openbulls/db/client";
import type { JobsServices } from "@openbulls/jobs";
import { type LoggerLike, noopLogger } from "@openbulls/logger";

import {
  type AutomationDeps,
  type AutomationServices,
  attachAgentRunToExecution,
  dispatchDueJobs,
  findDueJobs,
  listExecutors,
  markExecutionResult,
} from "../application";
import { computeNextRunAt } from "../domain/schedule";

import { createDefaultExecutorRegistry } from "./default-registry.factory";
import {
  DrizzleScheduledJobExecutionRepository,
  DrizzleUserScheduledJobRepository,
} from "./repositories/drizzle-repositories";
import type {
  IScheduledJobExecutionRepository,
  IUserScheduledJobRepository,
} from "./repositories/ports";

export interface CreateAutomationServicesInput {
  readonly db: DatabaseOrTx;
  readonly jobs: JobsServices;
  readonly logger?: LoggerLike;
  readonly now?: () => Date;
}

export interface AutomationServicesHandle {
  readonly services: AutomationServices;
  readonly registry: AutomationServices["registry"];
  readonly userScheduledJobRepo: IUserScheduledJobRepository;
  readonly scheduledJobExecutionRepo: IScheduledJobExecutionRepository;
}

/**
 * Pure factory. Tests pass mocks; production wires the Drizzle
 * repositories and the default registry.
 */
export function createAutomationServices(deps: AutomationDeps): AutomationServicesHandle {
  const logger: LoggerLike = deps.logger ?? noopLogger;
  const now: () => Date = deps.now ?? (() => new Date());
  const uuid: () => string = deps.uuid ?? randomUUID;

  const userScheduledJobRepo =
    deps.userScheduledJobRepo ?? new DrizzleUserScheduledJobRepository(deps.db);
  const scheduledJobExecutionRepo =
    deps.scheduledJobExecutionRepo ?? new DrizzleScheduledJobExecutionRepository(deps.db);

  const registry =
    deps.registry ??
    createDefaultExecutorRegistry({
      jobs: deps.jobs,
      ...(deps.marketData ? { marketData: deps.marketData } : {}),
    });

  const services: AutomationServices = {
    registry,
    userScheduledJobRepo,
    scheduledJobExecutionRepo,
    async findDueJobs(input) {
      return findDueJobs({
        db: deps.db,
        now,
        ...(input?.batchSize !== undefined ? { batchSize: input.batchSize } : {}),
      });
    },
    async dispatchDueJobs(input) {
      return dispatchDueJobs(
        {
          db: deps.db,
          jobs: deps.jobs,
          registry,
          userScheduledJobRepo,
          scheduledJobExecutionRepo,
          logger,
          now,
          uuid,
        },
        input ?? {},
      );
    },
    async markExecutionResult(input) {
      return markExecutionResult({ repo: scheduledJobExecutionRepo, now }, input);
    },
    async attachAgentRunToExecution(input) {
      return attachAgentRunToExecution({ repo: scheduledJobExecutionRepo }, input);
    },
    listExecutors() {
      return listExecutors(registry);
    },
  };

  return {
    services,
    registry,
    userScheduledJobRepo,
    scheduledJobExecutionRepo,
  };
}

// Re-export so the public barrel has one entry point for both
// composition and the registry.
export { createDefaultExecutorRegistry };
export { computeNextRunAt };
