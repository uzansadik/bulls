/**
 * @openbulls/automation — branded primitive types.
 *
 * Branding guards against accidental mixing of `JobDefinition.id` (UUID)
 * with `ScheduledJobExecution.id` (UUID), even though both are bare
 * strings at the wire level. Smart constructors validate at the
 * boundary; the brand prevents the wrong ID from reaching the wrong
 * repository downstream.
 *
 * Convention mirrors `@openbulls/jobs` and `@openbulls/agent-runtime`:
 * type and value share the same identifier; identity cast only.
 */
import type { Brand } from "@openbulls/shared";

/**
 * `user_scheduled_jobs.id` UUID. Stored in the DB; passed through the
 * BullMQ envelope as a plain string, re-branded at the call site.
 */
export type JobDefinitionId = Brand<string, "JobDefinitionId">;
export const JobDefinitionId = (s: string): JobDefinitionId => s as JobDefinitionId;

/**
 * `scheduled_job_executions.id` UUID. One execution = one BullMQ job
 * at most. Used by the `scheduled-job-dispatch` handler to attach
 * `agent_run_id` and to finalize status.
 */
export type ScheduledJobExecutionId = Brand<string, "ScheduledJobExecutionId">;
export const ScheduledJobExecutionId = (s: string): ScheduledJobExecutionId =>
  s as ScheduledJobExecutionId;
