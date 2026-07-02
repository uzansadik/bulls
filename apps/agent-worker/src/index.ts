/**
 * apps/agent-worker — process entrypoint.
 *
 * Boot sequence:
 *   1. Read server env.
 *   2. Build the @openbulls/jobs consumer (BullMQ Worker against
 *      REDIS_URL, queue name = env.WORKER_QUEUE_NAME).
 *   3. Build billing, market-data, portfolio, db repositories.
 *   4. Wire adapters + agent-runtime + register default graphs.
 *   5. Register the `agent-run` handler.
 *   6. Start heartbeat + consumer.
 *   7. SIGTERM / SIGINT → drain worker + close DB pool.
 *
 * The process never exits by itself; it relies on the supervisor
 * (systemd, k8s, fly.io) to send SIGTERM.
 */

import { createBillingServicesFromDb } from "@openbulls/billing";
import { serverEnv } from "@openbulls/config";
import { closeDb, db } from "@openbulls/db/client";
import { createRepositories } from "@openbulls/db/repositories";
import {
  type IJobConsumer,
  createBullMqConsumer,
  createJobsServicesFromEnv,
} from "@openbulls/jobs";
import { logger as pinoLogger } from "@openbulls/logger";
import { type MarketDataEnv, createMarketDataServicesFromEnv } from "@openbulls/market-data";
import { type PortfolioServices, createPortfolioServicesFromDb } from "@openbulls/portfolio";

import { processMain } from "./process";

const REQUIRED_REDIS = (env: ReturnType<typeof serverEnv>): string => {
  if (!env.REDIS_URL) {
    throw new Error("REDIS_URL is required for apps/agent-worker");
  }
  return env.REDIS_URL;
};

async function main(): Promise<void> {
  const env = serverEnv();
  pinoLogger.info(
    {
      queue: env.WORKER_QUEUE_NAME,
      concurrency: env.WORKER_CONCURRENCY,
      model: env.AGENT_GRAPH_DEFAULT_MODEL,
    },
    "agent-worker: booting",
  );

  const redisUrl = REQUIRED_REDIS(env);

  // 1. Jobs (BullMQ) — owns the queue name + Redis connection.
  //    We also need the raw consumer to register handlers; the
  //    JobsServices surface only exposes producer-side commands.
  const jobs = await createJobsServicesFromEnv({
    redisUrl,
    queueName: env.WORKER_QUEUE_NAME,
    concurrency: env.WORKER_CONCURRENCY,
    logger: pinoLogger,
  });
  const consumer: IJobConsumer = createBullMqConsumer({
    queueName: env.WORKER_QUEUE_NAME,
    connection: { url: redisUrl },
    concurrency: env.WORKER_CONCURRENCY,
    logger: pinoLogger,
  });

  // 2. Billing — Drizzle repositories + Stripe default gateway.
  const billing = createBillingServicesFromDb({
    db,
    env,
    ...(env.STRIPE_SECRET_KEY ? { provider: "stripe" as const } : {}),
  });

  // 3. Market data — wire a router + in-memory caches. The worker
  //    uses the mock adapter for now (Faz 8 swaps real providers
  //    in once provisioning is in place).
  const marketEnv: MarketDataEnv = {
    ...(env.YAHOO_FINANCE_API_KEY ? { YAHOO_FINANCE_API_KEY: env.YAHOO_FINANCE_API_KEY } : {}),
    ...(env.TWELVE_DATA_API_KEY ? { TWELVE_DATA_API_KEY: env.TWELVE_DATA_API_KEY } : {}),
    ...(env.KAP_API_KEY ? { KAP_API_KEY: env.KAP_API_KEY } : {}),
    ...(env.TCMB_API_KEY ? { TCMB_API_KEY: env.TCMB_API_KEY } : {}),
  };
  const marketData = createMarketDataServicesFromEnv({
    env: marketEnv,
    logger: pinoLogger,
  });

  // 4. Portfolio — narrow adapter from the market-data bundle.
  const repos = createRepositories(db);
  const portfolio: PortfolioServices = createPortfolioServicesFromDb({
    db: db as never,
    marketData: marketData as never,
    portfolios: repos.portfolios,
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
    now: () => new Date(),
  });

  // 5. Process main loop — wires adapters + runtime + handlers.
  const handle = await processMain({
    env,
    jobs: jobs.services,
    billing,
    marketData,
    portfolio,
    consumer,
    logger: pinoLogger,
  });

  pinoLogger.info(
    {
      queue: env.WORKER_QUEUE_NAME,
      graphs: handle.services.graphRegistry.list().map((g) => g as string),
    },
    "agent-worker: ready",
  );

  // 6. Graceful shutdown.
  let stopping = false;
  const stop = async (signal: string): Promise<void> => {
    if (stopping) return;
    stopping = true;
    pinoLogger.info({ signal }, "agent-worker: shutting down");
    try {
      await handle.close();
      await jobs.close();
      await closeDb();
    } catch (err) {
      pinoLogger.error({ err: String(err) }, "agent-worker: shutdown failed");
    }
    process.exit(0);
  };
  process.on("SIGTERM", () => void stop("SIGTERM"));
  process.on("SIGINT", () => void stop("SIGINT"));
}

main().catch((err: unknown) => {
  pinoLogger.fatal({ err: String(err) }, "agent-worker: fatal");
  process.exit(1);
});
