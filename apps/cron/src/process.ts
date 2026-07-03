/**
 * apps/cron — main loop.
 *
 * Boot sequence:
 *   1. Read server env (config).
 *   2. Build the BullMQ producer (jobs) — needed because
 *      `automation.dispatchDueJobs` enqueues downstream jobs.
 *   3. Build the automation services (registry + repositories).
 *   4. Start the dispatch tick on `setInterval(CRON_TICK_INTERVAL_MS)`.
 *   5. SIGTERM / SIGINT → graceful shutdown.
 *
 * The process never exits by itself; it relies on the supervisor
 * (systemd, k8s, fly.io) to send SIGTERM.
 */
import type { AutomationServices } from "@openbulls/automation";
import type { ServerEnv } from "@openbulls/config";
import type { JobsServices } from "@openbulls/jobs";
import type { Logger } from "@openbulls/logger";

import { dispatchAdapter } from "./dispatch";

export interface ProcessMainInput {
  readonly env: ServerEnv;
  readonly automation: AutomationServices;
  readonly jobs: JobsServices;
  readonly logger: Logger;
}

export interface ProcessMainHandle {
  /** Close the timer + drain any in-flight tick. Idempotent. */
  close(): Promise<void>;
}

export async function processMain(input: ProcessMainInput): Promise<ProcessMainHandle> {
  const intervalMs = input.env.CRON_TICK_INTERVAL_MS;
  const batchSize = input.env.CRON_BATCH_SIZE;
  const logger = input.logger.child({ component: "cron" });

  let running = false;
  let stopped = false;
  let inFlight: Promise<void> | null = null;

  logger.info(
    {
      intervalMs,
      batchSize,
      queueName: input.env.CRON_QUEUE_NAME,
      executors: input.automation.listExecutors().map((e) => e.type),
    },
    "cron: starting",
  );

  const handle = setInterval(() => {
    if (running || stopped) return;
    running = true;
    inFlight = (async () => {
      try {
        const summary = await dispatchAdapter({
          automation: input.automation,
          batchSize,
        });
        logger.info({ summary }, "cron: tick");
      } catch (err) {
        logger.error({ err: String(err) }, "cron: tick failed");
      } finally {
        running = false;
      }
    })();
  }, intervalMs);
  // Don't keep the event loop alive solely on this timer — SIGTERM
  // must work even when no tick is in flight.
  if (typeof handle.unref === "function") handle.unref();

  return {
    async close() {
      stopped = true;
      clearInterval(handle);
      if (inFlight) {
        await inFlight.catch(() => undefined);
      }
      logger.info({}, "cron: stopped");
    },
  };
}
