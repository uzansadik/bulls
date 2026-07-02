/**
 * apps/agent-worker — local in-memory queue mock.
 *
 * Mirrors the public shape of `@openbulls/jobs`'s test helper but
 * is private to this app's tests (the upstream helper lives under
 * `__tests__/` and isn't part of the published package surface).
 */
import type { Result } from "@openbulls/shared";
import { ok } from "@openbulls/shared";

import { JobIdValue, QueueUnavailableError } from "@openbulls/jobs";
import type { EnvelopedJob, IJobConsumer, IJobProducer, JobError, JobKind } from "@openbulls/jobs";

export interface InMemoryQueueState {
  readonly enqueued: EnvelopedJob[];
  readonly processed: Array<{
    readonly kind: JobKind;
    readonly job: EnvelopedJob;
    readonly attempts: number;
  }>;
  readonly failedJobs: string[];
}

export interface InMemoryQueueHandle {
  readonly producer: IJobProducer;
  readonly consumer: IJobConsumer;
  readonly state: InMemoryQueueState;
  dispatch(): Promise<{ readonly processed: number; readonly failed: number }>;
  close(): Promise<void>;
}

class InMemoryProducer implements IJobProducer {
  jobs: EnvelopedJob[] = [];
  failNext = false;

  async enqueue(job: { kind: JobKind; [k: string]: unknown }): Promise<
    Result<{ readonly jobId: string }, JobError>
  > {
    if (this.failNext) {
      this.failNext = false;
      return {
        ok: false,
        error: new QueueUnavailableError("simulated queue unavailability", {
          queueName: "in-memory",
        }),
      };
    }
    const jobId = `mock-${this.jobs.length + 1}`;
    const enveloped = {
      ...job,
      jobId: JobIdValue(jobId),
      enqueuedAt: new Date().toISOString(),
    } as unknown as EnvelopedJob;
    this.jobs.push(enveloped);
    return ok({ jobId });
  }

  async enqueueMany(
    jobs: readonly { kind: JobKind; [k: string]: unknown }[],
  ): Promise<Result<readonly { readonly jobId: string }[], JobError>> {
    const results: { readonly jobId: string }[] = [];
    for (const j of jobs) {
      const r = await this.enqueue(j);
      if (!r.ok) {
        return r as Result<readonly { readonly jobId: string }[], JobError>;
      }
      results.push(r.value);
    }
    return ok(results);
  }

  async close() {
    // no-op
  }
}

class InMemoryConsumer implements IJobConsumer {
  readonly handlers = new Map<JobKind, (job: EnvelopedJob) => Promise<void>>();

  async process<K extends JobKind>(
    kind: K,
    handler: (job: Extract<EnvelopedJob, { kind: K }>) => Promise<void>,
  ): Promise<void> {
    this.handlers.set(kind, handler as (job: EnvelopedJob) => Promise<void>);
  }

  async start() {
    // no-op
  }

  async pause() {
    // no-op
  }

  async stop() {
    // no-op
  }
}

export function createInMemoryQueue(): InMemoryQueueHandle {
  const producer = new InMemoryProducer();
  const consumer = new InMemoryConsumer();
  const state: InMemoryQueueState = {
    enqueued: producer.jobs,
    processed: [],
    failedJobs: [],
  };

  return {
    producer,
    consumer,
    state,
    async dispatch() {
      let processed = 0;
      let failed = 0;
      for (const job of [...state.enqueued]) {
        const handler = consumer.handlers.get(job.kind);
        if (!handler) continue;
        try {
          await handler(job);
          state.processed.push({ kind: job.kind, job, attempts: 1 });
          processed++;
        } catch (_err) {
          state.failedJobs.push(job.jobId);
          failed++;
        }
      }
      return { processed, failed };
    },
    async close() {
      await producer.close();
      await consumer.stop();
    },
  };
}
