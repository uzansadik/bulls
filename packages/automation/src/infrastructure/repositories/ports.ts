/**
 * @openbulls/automation — repository ports.
 *
 * Domain-shaped interfaces for the two tables this package owns:
 *   - `user_scheduled_jobs`              (definition)
 *   - `scheduled_job_executions`         (audit trail of one dispatch)
 *
 * The Drizzle implementation lives in `drizzle-repositories.ts`.
 * Both ports are intentionally narrow — only the operations the
 * application layer actually needs. Adding methods here is a
 * signal that the new use case is real, not hypothetical.
 */
import type {
  ScheduledJobExecution,
  UserScheduledJob,
} from "@openbulls/db/schema/automation.schema";

/**
 * `user_scheduled_jobs` port.
 *
 * - `findDue(now, batchSize)` — used by the dispatcher.
 * - `advanceNextRunAt(id, next)` — used after each successful or
 *   failed dispatch so the same row is not re-issued.
 * - `getById(id)` — used by the `scheduled-job-dispatch` handler
 *   in `apps/agent-worker` to resolve the schedule metadata.
 * - `create / listByUser / pause / resume` — future admin tool
 *   surface; not exercised by Faz 5 but ports are stable.
 */
export interface IUserScheduledJobRepository {
  findDue(now: Date, batchSize: number): Promise<readonly UserScheduledJob[]>;
  advanceNextRunAt(id: string, nextRunAt: Date): Promise<void>;
  getById(id: string): Promise<UserScheduledJob | null>;
  create(input: UserScheduledJob): Promise<UserScheduledJob>;
  listByUser(userId: string): Promise<readonly UserScheduledJob[]>;
  setStatus(id: string, status: UserScheduledJob["status"]): Promise<void>;
}

/**
 * `scheduled_job_executions` port.
 *
 * The execution row follows a strict state machine:
 *   queued → running → (succeeded | failed | skipped)
 * Status guards inside the Drizzle adapter prevent
 * out-of-order transitions (e.g. marking a `succeeded` row as
 * `running` again). See the implementation comments.
 */
export interface IScheduledJobExecutionRepository {
  /**
   * Insert a fresh execution row in `queued` status. Returns the
   * inserted row (with the generated UUID).
   */
  createQueued(input: {
    readonly jobId: string;
    readonly payload: Readonly<Record<string, unknown>>;
  }): Promise<ScheduledJobExecution>;

  /**
   * Transition `queued → running`. The `jobId` column is reused
   * to store the BullMQ job id so the audit trail can be joined
   * back to the queue. Passing `null` is allowed (a row may be
   * marked `running` before BullMQ returns an id, in tests).
   */
  markRunning(executionId: string, jobId: string | null): Promise<void>;

  markSucceeded(executionId: string): Promise<void>;
  markFailed(executionId: string, reason: string): Promise<void>;
  markSkipped(executionId: string, reason: string): Promise<void>;
  attachAgentRun(executionId: string, agentRunId: string): Promise<void>;
  getById(executionId: string): Promise<ScheduledJobExecution | null>;
}
