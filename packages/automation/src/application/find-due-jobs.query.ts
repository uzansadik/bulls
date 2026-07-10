/**
 * @openbulls/automation — `findDueJobs` query.
 *
 * Pulls every `user_scheduled_jobs` row that is *due* for dispatch —
 * `status = 'active' AND nextRunAt <= now()`. Result is bounded by
 * `batchSize` so a single tick can never blow the worker's memory.
 *
 * Index: `user_scheduled_jobs_due_idx (status, nextRunAt)`. The query
 * orders by `nextRunAt ASC` so a long tick interval still drains the
 * oldest backlog first; the `LIMIT` caps total rows per call.
 *
 * Idempotency: this query is read-only. The dispatcher writes
 * `nextRunAt` to a future timestamp as part of the same tick,
 * so the same row is never re-issued until its next scheduled time.
 */
import { and, asc, eq, lte } from "drizzle-orm";

import type { DatabaseOrTx } from "@openbulls/db/client";
import { type UserScheduledJob, userScheduledJobs } from "@openbulls/db/schema/automation.schema";

export interface FindDueJobsDeps {
  readonly db: DatabaseOrTx;
  readonly now?: () => Date;
  /** Cap on rows per tick. Default 50. */
  readonly batchSize?: number;
}

export interface FindDueJobsResult {
  readonly jobs: readonly UserScheduledJob[];
  readonly now: Date;
}

/**
 * Returns the set of due jobs. Ordering: oldest `nextRunAt` first.
 *
 * Edge case: a `null` `nextRunAt` is treated as "not due". Rows
 * without a `nextRunAt` are writeable but must be back-filled by
 * an admin tool before they can ever be picked up.
 */
export async function findDueJobs(deps: FindDueJobsDeps): Promise<FindDueJobsResult> {
  const now = (deps.now ?? (() => new Date()))();
  const batchSize = deps.batchSize ?? 50;

  const rows = await deps.db
    .select()
    .from(userScheduledJobs)
    .where(and(eq(userScheduledJobs.status, "active"), lte(userScheduledJobs.nextRunAt, now)))
    .orderBy(asc(userScheduledJobs.nextRunAt))
    .limit(batchSize);

  return { jobs: rows, now };
}
