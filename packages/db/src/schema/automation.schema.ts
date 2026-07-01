import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { aiAgentRuns } from "./ai.schema";
import { user } from "./auth.schema";
import {
  executionStatusEnum,
  jobExecutorTypeEnum,
  queueItemStatusEnum,
  scheduledJobStatusEnum,
} from "./enums";

export const userScheduledJobs = pgTable(
  "user_scheduled_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    executorType: jobExecutorTypeEnum("executor_type").notNull(),
    cron: varchar("cron", { length: 64 }).notNull(),
    timezone: varchar("timezone", { length: 64 }).notNull().default("Europe/Istanbul"),
    inputPayload: jsonb("input_payload").notNull().default({}),
    status: scheduledJobStatusEnum("status").notNull(),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("user_scheduled_jobs_user_status_idx").on(table.userId, table.status),
    index("user_scheduled_jobs_due_idx").on(table.status, table.nextRunAt),
  ],
);

export const scheduledJobExecutions = pgTable(
  "scheduled_job_executions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => userScheduledJobs.id, { onDelete: "cascade" }),
    agentRunId: uuid("agent_run_id").references(() => aiAgentRuns.id, {
      onDelete: "set null",
    }),
    status: executionStatusEnum("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    error: text("error"),
    payload: jsonb("payload"),
  },
  (table) => [
    index("scheduled_job_executions_job_started_idx").on(table.jobId, sql`${table.startedAt} DESC`),
  ],
);

/**
 * Generic, PG-backed queue table. The runtime in packages/jobs can use this
 * directly or wrap it behind BullMQ later — the table is the contract.
 */
export const jobQueueItems = pgTable(
  "job_queue_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    queueName: varchar("queue_name", { length: 64 }).notNull(),
    payload: jsonb("payload").notNull(),
    status: queueItemStatusEnum("status").notNull(),
    runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
    attempts: smallint("attempts").notNull().default(0),
    maxAttempts: smallint("max_attempts").notNull().default(5),
    lockedBy: varchar("locked_by", { length: 64 }),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastError: text("last_error"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("job_queue_items_queue_status_run_at_idx").on(table.queueName, table.status, table.runAt),
    index("job_queue_items_locked_idx").on(table.lockedUntil),
  ],
);

// keep unused import silent — reserved for future TTL/counters
void integer;

export type UserScheduledJob = typeof userScheduledJobs.$inferSelect;
export type NewUserScheduledJob = typeof userScheduledJobs.$inferInsert;
export type ScheduledJobExecution = typeof scheduledJobExecutions.$inferSelect;
export type NewScheduledJobExecution = typeof scheduledJobExecutions.$inferInsert;
export type JobQueueItem = typeof jobQueueItems.$inferSelect;
export type NewJobQueueItem = typeof jobQueueItems.$inferInsert;
