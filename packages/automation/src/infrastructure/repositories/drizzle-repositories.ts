/**
 * @openbulls/automation — Drizzle implementations of the repository ports.
 *
 * Status guards:
 *   - `markRunning` requires the current row to be `queued`. If the
 *     row is already `running` (BullMQ redelivery), the call is a
 *     no-op — idempotent.
 *   - `markSucceeded | markFailed | markSkipped` require the current
 *     row to be `running` (or `queued` for `skipped` which can be
 *     reached without ever running). `succeeded` is terminal;
 *     re-marking does nothing.
 *
 * Why guards instead of a free-form `update`: the executor pattern
 * is allowed to be re-delivered by BullMQ. Without guards, a
 * redelivery could overwrite `succeeded` with `failed` and the
 * audit trail would lie.
 */
import { and, asc, eq, lte, sql } from "drizzle-orm";

import type { DatabaseOrTx } from "@openbulls/db/client";
import {
  type ScheduledJobExecution,
  type UserScheduledJob,
  scheduledJobExecutions,
  userScheduledJobs,
} from "@openbulls/db/schema/automation.schema";

import type { IScheduledJobExecutionRepository, IUserScheduledJobRepository } from "./ports";

// ── UserScheduledJob ─────────────────────────────────────────────────────

export class DrizzleUserScheduledJobRepository implements IUserScheduledJobRepository {
  constructor(private readonly db: DatabaseOrTx) {}

  async findDue(now: Date, batchSize: number): Promise<readonly UserScheduledJob[]> {
    return this.db
      .select()
      .from(userScheduledJobs)
      .where(and(eq(userScheduledJobs.status, "active"), lte(userScheduledJobs.nextRunAt, now)))
      .orderBy(asc(userScheduledJobs.nextRunAt))
      .limit(batchSize);
  }

  async advanceNextRunAt(id: string, nextRunAt: Date): Promise<void> {
    await this.db
      .update(userScheduledJobs)
      .set({ nextRunAt, lastRunAt: new Date() })
      .where(eq(userScheduledJobs.id, id));
  }

  async getById(id: string): Promise<UserScheduledJob | null> {
    const row = await this.db.query.userScheduledJobs.findFirst({
      where: eq(userScheduledJobs.id, id),
    });
    return row ?? null;
  }

  async create(input: UserScheduledJob): Promise<UserScheduledJob> {
    const rows = await this.db.insert(userScheduledJobs).values(input).returning();
    const row = rows[0];
    if (!row) {
      throw new Error("failed to insert user_scheduled_jobs row");
    }
    return row;
  }

  async listByUser(userId: string): Promise<readonly UserScheduledJob[]> {
    return this.db
      .select()
      .from(userScheduledJobs)
      .where(eq(userScheduledJobs.userId, userId))
      .orderBy(asc(userScheduledJobs.createdAt));
  }

  async setStatus(id: string, status: UserScheduledJob["status"]): Promise<void> {
    await this.db.update(userScheduledJobs).set({ status }).where(eq(userScheduledJobs.id, id));
  }
}

// ── ScheduledJobExecution ────────────────────────────────────────────────

export class DrizzleScheduledJobExecutionRepository implements IScheduledJobExecutionRepository {
  constructor(private readonly db: DatabaseOrTx) {}

  async createQueued(input: {
    readonly jobId: string;
    readonly payload: Readonly<Record<string, unknown>>;
  }): Promise<ScheduledJobExecution> {
    const rows = await this.db
      .insert(scheduledJobExecutions)
      .values({
        jobId: input.jobId,
        status: "queued",
        payload: input.payload as object,
      })
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error("failed to insert scheduled_job_executions row");
    }
    return row;
  }

  async markRunning(executionId: string, jobId: string | null): Promise<void> {
    // Idempotent: only updates if the row is still `queued` (or
    // already `running` with a different `agent_run_id` — we don't
    // touch the agent_run_id here, only the status + jobId).
    const update: Partial<typeof scheduledJobExecutions.$inferInsert> = {
      status: "running",
      startedAt: new Date(),
    };
    if (jobId !== null) {
      (update as { jobId?: string }).jobId = jobId;
    }
    await this.db
      .update(scheduledJobExecutions)
      .set(update)
      .where(
        and(
          eq(scheduledJobExecutions.id, executionId),
          // Allowed source states.
          sql`${scheduledJobExecutions.status} IN ('queued', 'running')`,
        ),
      );
  }

  async markSucceeded(executionId: string): Promise<void> {
    await this.db
      .update(scheduledJobExecutions)
      .set({
        status: "succeeded",
        completedAt: new Date(),
      })
      .where(
        and(
          eq(scheduledJobExecutions.id, executionId),
          sql`${scheduledJobExecutions.status} IN ('running', 'queued')`,
        ),
      );
  }

  async markFailed(executionId: string, reason: string): Promise<void> {
    await this.db
      .update(scheduledJobExecutions)
      .set({
        status: "failed",
        completedAt: new Date(),
        error: reason,
      })
      .where(
        and(
          eq(scheduledJobExecutions.id, executionId),
          sql`${scheduledJobExecutions.status} IN ('running', 'queued')`,
        ),
      );
  }

  async markSkipped(executionId: string, reason: string): Promise<void> {
    await this.db
      .update(scheduledJobExecutions)
      .set({
        status: "skipped",
        completedAt: new Date(),
        error: reason,
      })
      .where(eq(scheduledJobExecutions.id, executionId));
  }

  async attachAgentRun(executionId: string, agentRunId: string): Promise<void> {
    await this.db
      .update(scheduledJobExecutions)
      .set({ agentRunId })
      .where(eq(scheduledJobExecutions.id, executionId));
  }

  async getById(executionId: string): Promise<ScheduledJobExecution | null> {
    const row = await this.db.query.scheduledJobExecutions.findFirst({
      where: eq(scheduledJobExecutions.id, executionId),
    });
    return row ?? null;
  }
}
