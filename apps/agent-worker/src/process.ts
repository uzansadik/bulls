/**
 * apps/agent-worker — main loop.
 *
 * Wires the BullMQ consumer to the agent-runtime's `runGraph`
 * service, registers a single handler for the `agent-run` job
 * kind, and starts the heartbeat. Returns the consumer + heartbeat
 * so the caller can shut them down on SIGTERM / SIGINT.
 *
 * Composes:
 *
 *   @openbulls/db            ─┐
 *   @openbulls/billing        │
 *   @openbulls/market-data    ├── adapters ─→ AgentRuntimeServices
 *   @openbulls/portfolio      │
 *   @openbulls/jobs           ─┘
 *
 *   AgentRuntimeServices.runGraph + BullMQ "agent-run" handler
 */
import type { AgentRuntimeDeps, AgentRuntimeServices, LoggerLike } from "@openbulls/agent-runtime";
import {
  GraphRegistry,
  createAgentRuntimeServices,
  registerDefaultGraphs,
} from "@openbulls/agent-runtime";
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
import { createPortfolioAdapter } from "./infrastructure/portfolio-adapter";
import { makeAgentRunHandler } from "./job-handler";

/** Inputs the boot sequence needs. `services` come pre-wired by the caller. */
export interface ProcessMainInput {
  readonly env: ServerEnv;
  readonly jobs: JobsServices;
  readonly billing: BillingServices;
  readonly marketData: MarketDataServices;
  readonly portfolio: PortfolioServices;
  readonly consumer: import("@openbulls/jobs").IJobConsumer;
  readonly logger?: Logger;
}

export interface ProcessMainHandle {
  readonly services: AgentRuntimeServices;
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
  const registry = registerDefaultGraphs(new GraphRegistry());

  const runtimeDeps: AgentRuntimeDeps = {
    graphRegistry: registry,
    agentRuns: repos.agentRuns,
    checkpointer: undefined as never, // composed below
    billing: createBillingAdapter(input.billing),
    marketData: createMarketDataAdapter(input.marketData, loggerLike),
    portfolio: createPortfolioAdapter(input.portfolio, loggerLike),
    jobs: createJobsAdapter(input.jobs),
    logger: loggerLike,
    now: () => Date.now(),
  };

  // Wire the checkpointer against the same agent-run repo so
  // `loadLatestSnapshot` reads through the same DB handle.
  const services = createAgentRuntimeServices({
    ...runtimeDeps,
    checkpointer: new (await import("@openbulls/agent-runtime")).DrizzleCheckpointerSaver(
      repos.agentRuns,
    ),
  });

  await input.consumer.process("agent-run", makeAgentRunHandler({ services, logger: loggerLike }));
  await input.consumer.start();

  const heartbeat = startWorkerHeartbeat(input.logger ?? pinoLogger, input.env);

  return {
    services,
    heartbeat,
    async close(): Promise<void> {
      heartbeat.stop();
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
