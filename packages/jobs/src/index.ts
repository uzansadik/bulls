/**
 * @openbulls/jobs — public barrel.
 *
 * Consumers (apps/web, apps/cron, apps/agent-worker, agent-runtime)
 * import everything from this entry point. Internal implementation
 * details stay inside their respective subpaths.
 */

// Domain types and discriminated union
export type { Job, JobKind, JobOf, JobInput } from "./domain/job-type";
export type {
  AgentRunJob,
  ScheduledJobDispatchJob,
  NotificationDispatchJob,
  ReportRenderJob,
} from "./domain/job-type";

// Branded primitives + smart constructors
export type { JobId, ThreadId, GraphKey } from "./domain/brands";
export {
  JobId as JobIdValue,
  ThreadId as ThreadIdValue,
  GraphKey as GraphKeyValue,
} from "./domain/brands";

// Domain errors (typed Result<T, JobError>)
export {
  QueueUnavailableError,
  JobNotFoundError,
  PayloadInvalidError,
  BackpressureExceededError,
} from "./domain/errors";
export type { JobError } from "./domain/errors";

// Ports
export type {
  IJobProducer,
  IJobConsumer,
  JobOfPayload,
  EnvelopedJob,
} from "./domain/ports/queue.port";

// Application services
export type {
  JobsDeps,
  JobsServices,
  EnqueueAgentRunInput,
  EnqueueScheduledJobDispatchInput,
  EnqueueNotificationDispatchInput,
  EnqueueReportRenderInput,
  EnqueueResult,
} from "./application/jobs.types";
export { enqueueAgentRun } from "./application/enqueue-agent-run.command";
export { enqueueScheduledJobDispatch } from "./application/enqueue-scheduled-job-dispatch.command";
export { enqueueNotificationDispatch } from "./application/enqueue-notification-dispatch.command";
export { enqueueReportRender } from "./application/enqueue-report-render.command";
export {
  createJobsServices,
  createJobsServicesFromEnv,
} from "./application/composition";
export type {
  CreateJobsServicesFromEnvInput,
  CreateJobsServicesFromEnvHandle,
} from "./application/composition";

// Infrastructure (advanced / opt-in)
export { createBullMqProducer } from "./infrastructure/bullmq-producer";
export { createBullMqConsumer } from "./infrastructure/bullmq-consumer";
export { createBullMqQueues } from "./infrastructure/queue.factory";
export type { CreateBullMqProducerInput } from "./infrastructure/bullmq-producer";
export type { CreateBullMqConsumerInput } from "./infrastructure/bullmq-consumer";
export type {
  CreateBullMqQueuesInput,
  BullMqQueuesHandle,
} from "./infrastructure/queue.factory";
export type { LoggerLike } from "./infrastructure/log";
export { noopLogger, toLoggerLike } from "./infrastructure/log";
