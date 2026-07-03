/**
 * apps/cron — process entrypoint.
 *
 * Boot sequence:
 *   1. Read server env.
 *   2. Build the jobs services (BullMQ producer + consumer).
 *   3. Build the automation services (registry + repositories).
 *   4. Start the dispatch loop.
 *   5. SIGTERM / SIGINT → graceful shutdown.
 */
import { createAutomationServices } from "@openbulls/automation";
import { serverEnv } from "@openbulls/config";
import { closeDb } from "@openbulls/db/client";
import { createJobsServicesFromEnv } from "@openbulls/jobs";
import { logger as pinoLogger } from "@openbulls/logger";

import { processMain } from "./process";

const REQUIRED_REDIS = (env: ReturnType<typeof serverEnv>): string => {
  if (!env.REDIS_URL) {
    throw new Error("REDIS_URL is required for apps/cron");
  }
  return env.REDIS_URL;
};

async function main(): Promise<void> {
  const env = serverEnv();
  pinoLogger.info(
    {
      tickIntervalMs: env.CRON_TICK_INTERVAL_MS,
      batchSize: env.CRON_BATCH_SIZE,
      queueName: env.CRON_QUEUE_NAME,
    },
    "cron: booting",
  );

  const redisUrl = REQUIRED_REDIS(env);

  // Jobs (BullMQ) — only the producer side is strictly required for
  // dispatch, but `createJobsServicesFromEnv` returns the full surface
  // (producer + consumer) so the same wiring can be reused by future
  // cron-side jobs (e.g. a self-queue for retries).
  const jobs = await createJobsServicesFromEnv({
    redisUrl,
    queueName: env.CRON_QUEUE_NAME,
    logger: pinoLogger,
  });

  // Automation services — DB repositories + registry.
  const automation = createAutomationServices({
    db: (await import("@openbulls/db/client")).db,
    jobs: jobs.services,
    logger: pinoLogger,
  });

  // Start the dispatch loop.
  const handle = await processMain({
    env,
    automation: automation.services,
    jobs: jobs.services,
    logger: pinoLogger,
  });

  // Graceful shutdown.
  let stopping = false;
  const stop = async (signal: string): Promise<void> => {
    if (stopping) return;
    stopping = true;
    pinoLogger.info({ signal }, "cron: shutting down");
    try {
      await handle.close();
      await jobs.close();
      await closeDb();
    } catch (err) {
      pinoLogger.error({ err: String(err) }, "cron: shutdown failed");
    }
    process.exit(0);
  };
  process.on("SIGTERM", () => void stop("SIGTERM"));
  process.on("SIGINT", () => void stop("SIGINT"));
}

main().catch((err: unknown) => {
  pinoLogger.fatal({ err: String(err) }, "cron: fatal");
  process.exit(1);
});
