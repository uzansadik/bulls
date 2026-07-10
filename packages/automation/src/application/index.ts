/**
 * @openbulls/automation — application barrel.
 *
 * Re-exports ports, use cases, and the `AutomationServices` /
 * `AutomationDeps` types. Infrastructure adapters live in
 * `infrastructure/` and are not re-exported here.
 */

export type { IExecutorRegistry } from "./executor-registry";
export { InMemoryExecutorRegistry } from "./executor-registry";

export { findDueJobs } from "./find-due-jobs.query";
export type { FindDueJobsDeps, FindDueJobsResult } from "./find-due-jobs.query";

export { dispatchDueJobs } from "./dispatch-due-jobs.command";

export {
  attachAgentRunToExecution,
  markExecutionResult,
} from "./mark-execution-result.command";
export type {
  AttachAgentRunDeps,
  MarkExecutionResultDeps,
} from "./mark-execution-result.command";

export { listExecutors } from "./list-executors.query";

export type {
  AttachAgentRunInput,
  AutomationDeps,
  AutomationServices,
  DispatchSummary,
  ExecutionStatusTransition,
  ExecutorDescriptor,
  MarkExecutionResultInput,
} from "./jobs.types";
