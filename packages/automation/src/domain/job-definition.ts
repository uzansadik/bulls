/**
 * @openbulls/automation — domain type for a user-defined scheduled job.
 *
 * `JobDefinition` mirrors the `user_scheduled_jobs` table row. We re-export
 * the Drizzle-inferred types when they're already a perfect fit rather
 * than re-declaring them; this keeps the schema declaration the single
 * source of truth.
 *
 * `ExecutorType` and `ScheduledJobStatus` are literal unions aligned
 * 1:1 with the `jobExecutorTypeEnum` / `scheduledJobStatusEnum` pgEnums
 * declared in `@openbulls/db/src/schema/enums.ts`. Drizzle's `enumValues`
 * tuple already gives us the runtime list; we derive the TS type from
 * it so a migration adding a new variant lights up the registry check.
 */
import { z } from "zod";

import type { jobExecutorTypeEnum, scheduledJobStatusEnum } from "@openbulls/db/schema/enums";

import type { NewUserScheduledJob, UserScheduledJob } from "@openbulls/db/schema/automation.schema";

/**
 * Allowed executor types. Strings mirror the `jobExecutorTypeEnum` pgEnum
 * so a migration adding a new variant lights up the registry/test
 * typecheck before reaching runtime.
 */
export type ExecutorType = (typeof jobExecutorTypeEnum.enumValues)[number];

/**
 * Possible statuses for a user-defined scheduled job. `"deleted"` is
 * soft-delete; rows are never hard-deleted because
 * `scheduled_job_executions` references them with `ON DELETE CASCADE`.
 */
export type ScheduledJobStatus = (typeof scheduledJobStatusEnum.enumValues)[number];

/**
 * Domain view of a `user_scheduled_jobs` row. Structurally identical
 * to the Drizzle-inferred type — re-exported so application code
 * imports the domain name consistently.
 */
export type JobDefinition = UserScheduledJob;

/**
 * Insert shape for a new `JobDefinition`. Used by future admin tools;
 * Faz 5 itself doesn't create rows (DB seed/admin commands only).
 */
export type NewJobDefinition = NewUserScheduledJob;

// ── Input validation schemas ───────────────────────────────────────────
//
// Zod schemas live here so the dispatcher and the (future) admin tool
// share one validation path. Cron is validated via croner inside
// `schedule.ts`; we keep the structural rules here as a cheap
// pre-filter.

/**
 * Cron expression — 5-field standard. The expression is owned by croner
 * for parsing; we only ensure it is non-empty and within a sane
 * length budget before calling `computeNextRunAt`.
 */
export const cronExpressionSchema = z
  .string()
  .min(1, "cron expression must not be empty")
  .max(64, "cron expression must be 64 chars or fewer");

/**
 * IANA timezone identifier (e.g. `Europe/Istanbul`). Lower bound: 1
 * character. Upper bound: 64 (matches DB `varchar(64)`).
 */
export const timezoneSchema = z
  .string()
  .min(1, "timezone must not be empty")
  .max(64, "timezone must be 64 chars or fewer");

/**
 * Validated payload stored in `user_scheduled_jobs.inputPayload`.
 * Free-form record; executors tighten via their own `buildPayload`.
 */
export const jobDefinitionInputPayloadSchema = z.record(z.string(), z.unknown()).default({});

// Re-export so the barrel can pull everything from one place.
export type { UserScheduledJob, NewUserScheduledJob };
