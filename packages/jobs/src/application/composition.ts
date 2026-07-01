/**
 * @openbulls/jobs — application composition root.
 *
 * Wires the four enqueue commands behind a single factory. Tests pass
 * their own in-memory producer/consumer; production uses the BullMQ
 * factory from `infrastructure/queue.factory.ts`.
 *
 * `createJobsServices` is the pure-construction entry point. A thin
 * `createJobsServicesFromEnv` wrapper (in the same file) accepts the
 * same inputs the agent-worker uses at boot.
 */
import type { IJobConsumer, IJobProducer } from "../domain/ports/queue.port";
import type { LoggerLike } from "../infrastructure/log";
import { noopLogger } from "../infrastructure/log";
import { enqueueAgentRun } from "./enqueue-agent-run.command";
import { enqueueNotificationDispatch } from "./enqueue-notification-dispatch.command";
import { enqueueReportRender } from "./enqueue-report-render.command";
import { enqueueScheduledJobDispatch } from "./enqueue-scheduled-job-dispatch.command";
import type { JobsDeps, JobsServices } from "./jobs.types";

/**
 * Pure factory. Tests call this with mocks; production passes the
 * real BullMQ producer/consumer.
 */
export function createJobsServices(deps: JobsDeps): JobsServices {
  const logger: LoggerLike = deps.logger ?? noopLogger;
  const producer: IJobProducer = deps.producer;
  const consumer: IJobConsumer = deps.consumer;

  // Pre-bind the producer + logger so each command can be invoked
  // with a single argument (the input). Consumers don't enqueue,
  // so they're not threaded through.
  void consumer; // reserved for future inspection (metrics etc.)

  return {
    enqueueAgentRun: (input) => enqueueAgentRun({ producer, logger }, input),
    enqueueScheduledJobDispatch: (input) =>
      enqueueScheduledJobDispatch({ producer, logger }, input),
    enqueueNotificationDispatch: (input) =>
      enqueueNotificationDispatch({ producer, logger }, input),
    enqueueReportRender: (input) => enqueueReportRender({ producer, logger }, input),
  };
}

/**
 * Convenience factory: builds the BullMQ handle and wires it into
 * the services. The caller owns the lifecycle of the returned
 * `close` function (typically wired to SIGTERM / SIGINT).
 *
 * NOTE: This helper is intentionally thin — env parsing belongs in
 * `@openbulls/config`. The caller passes in a ready-to-use Redis URL
 * and queue name.
 */
export interface CreateJobsServicesFromEnvInput {
  readonly redisUrl: string;
  readonly queueName: string;
  readonly concurrency?: number;
  readonly logger?: LoggerLike;
}

export interface CreateJobsServicesFromEnvHandle {
  readonly services: JobsServices;
  readonly close: () => Promise<void>;
}

export async function createJobsServicesFromEnv(
  input: CreateJobsServicesFromEnvInput,
): Promise<CreateJobsServicesFromEnvHandle> {
  // Lazy import to keep the dependency optional for unit tests.
  const { createBullMqQueues } = await import("../infrastructure/queue.factory");
  const queues = createBullMqQueues({
    redisUrl: input.redisUrl,
    queueName: input.queueName,
    ...(input.concurrency !== undefined ? { concurrency: input.concurrency } : {}),
    ...(input.logger ? { logger: input.logger } : {}),
  });
  const services = createJobsServices({
    producer: queues.producer,
    consumer: queues.consumer,
    ...(input.logger ? { logger: input.logger } : {}),
  });
  return {
    services,
    close: () => queues.close(),
  };
}
