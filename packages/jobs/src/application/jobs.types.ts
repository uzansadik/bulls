/**
 * @openbulls/jobs — application-layer dependency & service types.
 *
 * `JobsDeps` is the constructor input for `createJobsServices`. Each use
 * case takes its own subset of these dependencies; everything is
 * optional and a sensible default is provided (noopLogger).
 *
 * `JobsServices` is the full surface returned by the factory. Consumers
 * always receive a fully-bound object; instantiating adapters by hand
 * is reserved for tests.
 */
import type { Result } from "@openbulls/shared";

import type { JobError } from "../domain/errors";
import type { IJobConsumer, IJobProducer } from "../domain/ports/queue.port";
import type { LoggerLike } from "../infrastructure/log";

export interface JobsDeps {
  readonly producer: IJobProducer;
  readonly consumer: IJobConsumer;
  readonly logger?: LoggerLike;
  readonly now?: () => Date;
}

export interface EnqueueAgentRunInput {
  readonly userId: string;
  readonly graphKey: string;
  readonly threadId: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly reservationId?: string;
}

export interface EnqueueScheduledJobDispatchInput {
  readonly executionId: string;
  readonly userId: string;
  readonly jobDefinitionKey: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface EnqueueNotificationDispatchInput {
  readonly userId: string;
  readonly notificationKind: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface EnqueueReportRenderInput {
  readonly userId: string;
  readonly reportType: string;
  readonly format: "pdf" | "excel" | "markdown";
  readonly payload: Readonly<Record<string, unknown>>;
}

export type EnqueueResult = Promise<Result<{ readonly jobId: string }, JobError>>;

export interface JobsServices {
  readonly enqueueAgentRun: (input: EnqueueAgentRunInput) => EnqueueResult;
  readonly enqueueScheduledJobDispatch: (input: EnqueueScheduledJobDispatchInput) => EnqueueResult;
  readonly enqueueNotificationDispatch: (input: EnqueueNotificationDispatchInput) => EnqueueResult;
  readonly enqueueReportRender: (input: EnqueueReportRenderInput) => EnqueueResult;
}
