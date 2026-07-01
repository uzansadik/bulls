/**
 * @openbulls/jobs — BullMQ producer + consumer factory.
 *
 * Combines the two adapters behind a single constructor so the consumer
 * process and the web app share the same wiring (and the same Redis
 * pool size defaults).
 *
 * Lifecycle:
 *   - `createBullMqQueues` opens BullMQ Queue + Worker + Redis pool.
 *   - `close()` flushes both, drains the worker, and disconnects Redis.
 *   - The factory returns the producer and consumer together because
 *     some processes (the worker) need both.
 *
 * Redis pool:
 *   - The factory accepts a pre-built `Redis` instance so the caller
 *     controls pooling. We do not manage `maxRetriesPerRequest` here —
 *     BullMQ requires it to be `null` for blocking commands, so the
 *     caller is responsible for that.
 */
import type { ConnectionOptions } from "bullmq";
import IORedis from "ioredis";

import { createBullMqConsumer } from "./bullmq-consumer";
import { createBullMqProducer } from "./bullmq-producer";
import type { LoggerLike } from "./log";

export interface CreateBullMqQueuesInput {
  readonly redisUrl: string;
  readonly queueName: string;
  readonly concurrency?: number;
  readonly logger?: LoggerLike;
}

export interface BullMqQueuesHandle {
  readonly producer: ReturnType<typeof createBullMqProducer>;
  readonly consumer: ReturnType<typeof createBullMqConsumer>;
  readonly connection: ConnectionOptions;
  close(): Promise<void>;
}

export function createBullMqQueues(input: CreateBullMqQueuesInput): BullMqQueuesHandle {
  const redis = new IORedis(input.redisUrl, {
    maxRetriesPerRequest: null, // required by BullMQ for blocking commands
    enableReadyCheck: false,
  });
  // BullMQ has its own bundled ioredis types; the runtime instance is
  // structurally compatible. We cast to BullMQ's `ConnectionOptions`
  // once at the boundary.
  const connection = redis as unknown as ConnectionOptions;
  const producer = createBullMqProducer({
    queueName: input.queueName,
    connection,
    ...(input.logger ? { logger: input.logger } : {}),
  });
  const consumer = createBullMqConsumer({
    queueName: input.queueName,
    connection,
    ...(input.concurrency !== undefined ? { concurrency: input.concurrency } : {}),
    ...(input.logger ? { logger: input.logger } : {}),
  });

  return {
    producer,
    consumer,
    connection,
    async close() {
      await Promise.allSettled([producer.close(), consumer.stop()]);
      redis.disconnect();
    },
  };
}
