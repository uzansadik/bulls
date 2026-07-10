/**
 * apps/agent-worker — main loop.
 *
 * Wires the BullMQ consumer to the agent-runtime's `CompiledGraphBundle`,
 * registers a single handler for the `agent-run` job kind, and starts
 * the heartbeat. Returns the consumer + heartbeat so the caller can
 * shut them down on SIGTERM / SIGINT.
 *
 * Composes:
 *
 *   @openbulls/db            ─┐
 *   @openbulls/billing        │
 *   @openbulls/market-data    ├── adapters ─→ CompiledGraphBundle.invoke / .stream
 *   @openbulls/portfolio      │
 *   @openbulls/jobs           ─┘
 *
 *   CompiledGraphBundle + BullMQ "agent-run" handler
 */
import type { CompiledGraphBundle, CompiledGraphDeps, LoggerLike } from "@openbulls/agent-runtime";
import {
  createCompiledGraphBundle,
  createPostgresSaver,
  defaultGraphFactories,
} from "@openbulls/agent-runtime";
import type {
  AutomationServices,
  IScheduledJobExecutionRepository,
  IUserScheduledJobRepository,
} from "@openbulls/automation";
import type { BillingServices } from "@openbulls/billing";
import type { ServerEnv } from "@openbulls/config";
import { db } from "@openbulls/db/client";
import { createRepositories } from "@openbulls/db/repositories";
import type { JobsServices } from "@openbulls/jobs";
import { type Logger, logger as pinoLogger } from "@openbulls/logger";
import type { MarketDataServices } from "@openbulls/market-data";
import type { PortfolioServices } from "@openbulls/portfolio";

import { createBillingAdapter } from "./infrastructure/billing-adapter";
import { createJobsAdapter } from "./infrastructure/jobs-adapter";
import { createMarketDataAdapter } from "./infrastructure/market-data-adapter";
import { createModelAdapter } from "./infrastructure/model-adapter";
import { createPortfolioAdapter } from "./infrastructure/portfolio-adapter";
import { makeAgentRunHandler } from "./job-handler";
import { makeScheduledJobDispatchHandler } from "./scheduled-job-dispatch-handler";

/** Inputs the boot sequence needs. `services` come pre-wired by the caller. */
export interface ProcessMainInput {
  readonly env: ServerEnv;
  readonly jobs: JobsServices;
  readonly billing: BillingServices;
  readonly marketData: MarketDataServices;
  readonly portfolio: PortfolioServices;
  readonly automation: AutomationServices;
  readonly userScheduledJobRepo: IUserScheduledJobRepository;
  readonly scheduledJobExecutionRepo: IScheduledJobExecutionRepository;
  readonly consumer: import("@openbulls/jobs").IJobConsumer;
  readonly logger?: Logger;
}

export interface ProcessMainHandle {
  readonly bundle: CompiledGraphBundle;
  readonly heartbeat: { stop(): void };
  /** Close the BullMQ worker + DB pool. Idempotent. */
  close(): Promise<void>;
}

/** Adapt a pino logger to the `LoggerLike` the runtime expects. */
function toLoggerLike(l: Logger | undefined): LoggerLike {
  if (!l) {
    return {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    };
  }
  return {
    debug: (msg, ctx) => l.debug(ctx ?? {}, msg),
    info: (msg, ctx) => l.info(ctx ?? {}, msg),
    warn: (msg, ctx) => l.warn(ctx ?? {}, msg),
    error: (msg, ctx) => l.error(ctx ?? {}, msg),
  };
}

export async function processMain(input: ProcessMainInput): Promise<ProcessMainHandle> {
  const loggerLike = toLoggerLike(input.logger);

  const repos = createRepositories(db);

  // PostgresSaver is the only persistence path — the LangGraph-native
  // adapter reads/writes `checkpoints` / `checkpoint_blobs` /
  // `checkpoint_writes` tables. Replaces the earlier custom
  // DrizzleCheckpointerSaver that lived in `packages/db`.
  const connectionString =
    (input.env as unknown as { AGENT_DB_URL?: string }).AGENT_DB_URL ??
    (input.env as unknown as { DATABASE_URL?: string }).DATABASE_URL ??
    "";
  const checkpointer = await createPostgresSaver({ connectionString });

  const runtimeDeps: CompiledGraphDeps = {
    checkpointer,
    agentRuns: repos.agentRuns,
    billing: createBillingAdapter(input.billing),
    marketData: createMarketDataAdapter(input.marketData, loggerLike),
    portfolio: createPortfolioAdapter(input.portfolio, loggerLike),
    jobs: createJobsAdapter(input.jobs),
    model: createModelAdapter({ env: input.env, logger: loggerLike }),
    logger: loggerLike,
    now: () => Date.now(),
  };

  const bundle = createCompiledGraphBundle({
    factories: defaultGraphFactories,
    deps: runtimeDeps,
  });

  await input.consumer.process("agent-run", makeAgentRunHandler({ bundle, logger: loggerLike }));
  await input.consumer.process(
    "scheduled-job-dispatch",
    makeScheduledJobDispatchHandler({
      automation: input.automation,
      userScheduledJobRepo: input.userScheduledJobRepo,
      scheduledJobExecutionRepo: input.scheduledJobExecutionRepo,
      logger: loggerLike,
      now: () => new Date(),
    }),
  );
  await input.consumer.start();

  const heartbeat = startWorkerHeartbeat(input.logger ?? pinoLogger, input.env);

  return {
    bundle,
    heartbeat,
    async close(): Promise<void> {
      heartbeat.stop();
      await bundle.close();
      await input.consumer.stop().catch((err: unknown) => {
        input.logger?.error({ err: String(err) }, "agent-worker: consumer.stop failed");
      });
    },
  };
}

function startWorkerHeartbeat(logger: Logger, env: ServerEnv): { stop(): void } {
  const intervalMs = env.WORKER_HEARTBEAT_INTERVAL_MS;
  if (intervalMs <= 0) {
    return { stop: () => undefined };
  }
  const handle = setInterval(() => {
    logger.info({ queue: env.WORKER_QUEUE_NAME }, "agent-worker alive");
  }, intervalMs);
  if (typeof handle.unref === "function") handle.unref();
  return {
    stop(): void {
      clearInterval(handle);
    },
  };
}
