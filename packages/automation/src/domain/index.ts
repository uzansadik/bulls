/**
 * @openbulls/automation — domain barrel.
 *
 * Re-exports the value-object types, error classes, executor port,
 * and the pure schedule helpers. Application code imports from
 * `@openbulls/automation` (root barrel); internals stay under
 * their respective paths.
 */

// Branded primitive types
export type { JobDefinitionId, ScheduledJobExecutionId } from "./brands";
export {
  JobDefinitionId as JobDefinitionIdValue,
  ScheduledJobExecutionId as ScheduledJobExecutionIdValue,
} from "./brands";

// Job definition value objects + validation schemas
export {
  type ExecutorType,
  type JobDefinition,
  type NewJobDefinition,
  type ScheduledJobStatus,
  type NewUserScheduledJob,
  type UserScheduledJob,
  cronExpressionSchema,
  timezoneSchema,
  jobDefinitionInputPayloadSchema,
} from "./job-definition";

// Executor port + context
export type {
  IExecutor,
  ExecutorContext,
  ExecutorRunKind,
  ExecutorRunResult,
} from "./executor";

// Pure schedule helpers
export {
  computeNextRunAt,
  isValidTimezone,
  validateCronExpression,
} from "./schedule";

// Domain errors
export {
  ExecutorAlreadyRegisteredError,
  ExecutorFailedError,
  ExecutorInvalidPayloadError,
  ExecutorNotFoundError,
  InvalidCronExpressionError,
  InvalidTimezoneError,
} from "./errors";
export type { AutomationError } from "./errors";
