import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { aiAgentRuns } from "./ai.schema";
import { user } from "./auth.schema";
import { reportFormatEnum, reportStatusEnum, reportTypeEnum } from "./enums";
import { portfolios } from "./portfolio.schema";

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    portfolioId: uuid("portfolio_id").references(() => portfolios.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    reportType: reportTypeEnum("report_type").notNull(),
    format: reportFormatEnum("format").notNull(),
    status: reportStatusEnum("status").notNull(),
    storageKey: text("storage_key"),
    parameters: jsonb("parameters").notNull().default({}),
    generatedAt: timestamp("generated_at", { withTimezone: true }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("reports_user_created_idx").on(table.userId, sql`${table.createdAt} DESC`),
    index("reports_status_idx").on(table.status),
  ],
);

export const reportJobs = pgTable(
  "report_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    agentRunId: uuid("agent_run_id").references(() => aiAgentRuns.id, {
      onDelete: "set null",
    }),
    status: reportStatusEnum("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    error: text("error"),
  },
  (table) => [
    index("report_jobs_report_idx").on(table.reportId),
    index("report_jobs_status_idx").on(table.status),
  ],
);

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
export type ReportJob = typeof reportJobs.$inferSelect;
export type NewReportJob = typeof reportJobs.$inferInsert;
