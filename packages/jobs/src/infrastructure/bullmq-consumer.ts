/**
 * @openbulls/jobs — BullMQ consumer adapter.
 *
 * Wraps a BullMQ `Worker` behind the `IJobConsumer` port. The adapter:
 *   - routes each dequeued job to the handler registered for its `kind`;
 *   - rejects unknown `kind` values with `JobNotFoundError` (defensive —
 *     should never happen because we use one queue per process);
 *   - throws on handler error so BullMQ's retry policy kicks in;
 *   - exposes start / pause / stop lifecycle.
 *
 * One `Worker` instance = one queue + one concurrency. To scale, run
 * multiple processes against the same queue.
 */
import type { ConnectionOptions, Worker } from "bullmq";
import { Worker as BullMqWorker } from "bullmq";

import { JobNotFoundError } from "../domain/errors";
import type { JobKind } from "../domain/job-type";
import type { EnvelopedJob, IJobConsumer } from "../domain/ports/queue.port";
import { type LoggerLike, noopLogger } from "./log";

export interface CreateBullMqConsumerInput {
  readonly queueName: string;
  readonly connection: ConnectionOptions;
  readonly concurrency?: number;
  /** Per-job timeout (ms). Default: 3 600 000 (1 hour). */
  readonly timeoutMs?: number;
  readonly logger?: LoggerLike;
}

export function createBullMqConsumer(
  input: CreateBullMqConsumerInput,
): IJobConsumer & { readonly raw: Worker } {
  const logger = input.logger ?? noopLogger;
  // handlers map: job kind -> handler. Filled lazily by `process()`.
  const handlers = new Map<JobKind, (job: EnvelopedJob) => Promise<void>>();

  const worker: Worker = new BullMqWorker(
    input.queueName,
    async (job) => {
      const kind = job.name as JobKind;
      const handler = handlers.get(kind);
      if (!handler) {
        logger.error("no handler registered for job kind", {
          queue: input.queueName,
          kind,
          jobId: job.id,
        });
        // Throwing triggers BullMQ retry; we want it to eventually
        // surface to the dead-letter queue rather than silently
        // succeed.
        throw new JobNotFoundError(`no handler for kind=${kind}`, {
          jobId: job.id ?? "<missing>",
          queueName: input.queueName,
        });
      }
      logger.debug("processing job", {
        queue: input.queueName,
        kind,
        jobId: job.id,
      });
      await handler(job.data as EnvelopedJob);
    },
    {
      connection: input.connection,
      concurrency: input.concurrency ?? 4,
      lockDuration: 30_000,
      settings: {
        backoffStrategy: (attemptsMade: number) => {
          // Exponential with cap at 1 hour.
          return Math.min(2 ** attemptsMade * 1_000, 3_600_000);
        },
      },
    },
  );

  worker.on("failed", (job, err) => {
    logger.error("job failed", err, {
      queue: input.queueName,
      jobId: job?.id,
      kind: job?.name,
      attemptsMade: job?.attemptsMade,
    });
  });
  worker.on("completed", (job) => {
    logger.debug("job completed", {
      queue: input.queueName,
      jobId: job.id,
      kind: job.name,
    });
  });

  const consumer: IJobConsumer = {
    async process<K extends JobKind>(
      kind: K,
      handler: (job: Extract<EnvelopedJob, { kind: K }>) => Promise<void>,
    ): Promise<void> {
      handlers.set(kind, handler as (job: EnvelopedJob) => Promise<void>);
      logger.debug("registered handler", {
        queue: input.queueName,
        kind,
      });
    },

    async start() {
      // BullMQ Worker starts processing as soon as it is constructed.
      // We expose `start` for symmetry with the port; calling it
      // multiple times is safe.
      if (!worker.isRunning()) {
        await worker.run();
      }
    },

    async pause() {
      await worker.pause();
      logger.info("consumer paused", { queue: input.queueName });
    },

    async stop() {
      await worker.close();
      logger.info("consumer stopped", { queue: input.queueName });
    },
  };

  return Object.assign(consumer, { raw: worker });
}
