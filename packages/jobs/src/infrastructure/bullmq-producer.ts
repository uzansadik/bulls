/**
 * @openbulls/jobs — BullMQ producer adapter.
 *
 * Wraps a BullMQ `Queue` instance behind the `IJobProducer` port. The
 * adapter:
 *   - generates `jobId` (UUID-like) when callers omit one;
 *   - stamps `enqueuedAt` ISO timestamp;
 *   - sets BullMQ retry policy (3 retries, exponential backoff);
 *   - serialises the discriminated payload into `job.data`;
 *   - exposes `close()` for graceful shutdown.
 *
 * BullMQ specifics:
 *   - One BullMQ Queue per call to `createBullMqProducer`. Multiple
 *     producers against the same Redis db are fine.
 *   - The `name` BullMQ stores on each job is our `kind`. The Worker
 *     uses the same convention.
 */
import { randomUUID } from "node:crypto";
import { type Result, err, ok } from "@openbulls/shared";
import type { Queue } from "bullmq";
import { Queue as BullMqQueue } from "bullmq";
import type { ConnectionOptions } from "bullmq";

import { JobId } from "../domain/brands";
import { type JobError, QueueUnavailableError } from "../domain/errors";
import type { IJobProducer, JobOfPayload } from "../domain/ports/queue.port";
import { type LoggerLike, noopLogger } from "./log";

export interface CreateBullMqProducerInput {
  readonly queueName: string;
  readonly connection: ConnectionOptions;
  readonly logger?: LoggerLike;
  /**
   * Override retry policy. Defaults to 3 attempts with exponential
   * backoff (1s base, 2h cap) — matches the rest of Openbulls.
   */
  readonly defaultJobOptions?: {
    readonly attempts?: number;
    readonly backoff?: { readonly type: "exponential" | "fixed"; readonly delay?: number };
    readonly removeOnComplete?: number | boolean;
    readonly removeOnFail?: number | boolean;
  };
}

export function createBullMqProducer(input: CreateBullMqProducerInput): IJobProducer {
  const logger = input.logger ?? noopLogger;
  const queue: Queue = new BullMqQueue(input.queueName, {
    connection: input.connection,
    defaultJobOptions: {
      attempts: input.defaultJobOptions?.attempts ?? 3,
      backoff: input.defaultJobOptions?.backoff ?? {
        type: "exponential",
        delay: 1_000,
      },
      removeOnComplete: input.defaultJobOptions?.removeOnComplete ?? 1_000,
      removeOnFail: input.defaultJobOptions?.removeOnFail ?? 5_000,
    },
  });

  return {
    async enqueue<K extends JobOfPayloadKind>(
      job: K,
    ): Promise<Result<{ readonly jobId: string }, JobError>> {
      const jobId = randomUUID();
      const enveloped = {
        ...job,
        jobId: JobId(jobId),
        enqueuedAt: new Date().toISOString(),
      };
      try {
        await queue.add(job.kind, enveloped, { jobId });
        logger.debug("enqueued job", {
          queue: input.queueName,
          kind: job.kind,
          jobId,
        });
        return ok({ jobId });
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        logger.error("queue.enqueue failed", cause, {
          queue: input.queueName,
          kind: job.kind,
        });
        return err(
          new QueueUnavailableError(`failed to enqueue ${job.kind}: ${message}`, {
            queueName: input.queueName,
            cause: message,
          }),
        );
      }
    },

    async enqueueMany<K extends JobOfPayloadKind>(
      jobs: readonly K[],
    ): Promise<Result<readonly { readonly jobId: string }[], JobError>> {
      const stamps = jobs.map((job) => ({
        name: job.kind,
        data: {
          ...job,
          jobId: JobId(randomUUID()),
          enqueuedAt: new Date().toISOString(),
        },
      }));
      try {
        await queue.addBulk(stamps);
        logger.debug("bulk-enqueued jobs", {
          queue: input.queueName,
          count: jobs.length,
        });
        return ok(stamps.map((s) => ({ jobId: s.data.jobId as string })));
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        logger.error("queue.addBulk failed", cause, {
          queue: input.queueName,
          count: jobs.length,
        });
        return err(
          new QueueUnavailableError(`failed to bulk enqueue: ${message}`, {
            queueName: input.queueName,
            cause: message,
          }),
        );
      }
    },

    async close() {
      await queue.close();
      logger.debug("producer closed", { queue: input.queueName });
    },
  };
}

/** Internal: any payload object produced by `enqueue*` carries a `kind`. */
type JobOfPayloadKind = JobOfPayload<never>;

/** Internal type re-export so consumers can extract `IJobProducer` shapes. */
export type { Queue };
