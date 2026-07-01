import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { user } from "./auth.schema";
import { agentRunStatusEnum, chatRoleEnum, stepStatusEnum, toolCallStatusEnum } from "./enums";

// ─── Chat (UI session storage) ───────────────────────────────────────────────

export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title"),
    modelKey: varchar("model_key", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("chat_sessions_user_updated_idx").on(table.userId, sql`${table.updatedAt} DESC`),
  ],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    role: chatRoleEnum("role").notNull(),
    content: text("content").notNull(),
    toolCalls: jsonb("tool_calls"),
    toolCallId: varchar("tool_call_id", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("chat_messages_session_created_idx").on(table.sessionId, table.createdAt)],
);

// ─── Agent Runs / Steps / Tool Calls ──────────────────────────────────────────

export const aiAgentRuns = pgTable(
  "ai_agent_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    graphKey: varchar("graph_key", { length: 64 }).notNull(),
    threadId: varchar("thread_id", { length: 128 }).notNull(),
    status: agentRunStatusEnum("status").notNull(),
    currentNodeKey: varchar("current_node_key", { length: 64 }),
    input: jsonb("input").notNull(),
    output: jsonb("output"),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("ai_agent_runs_user_status_idx").on(table.userId, table.status),
    index("ai_agent_runs_thread_idx").on(table.threadId),
    index("ai_agent_runs_graph_status_idx").on(table.graphKey, table.status),
  ],
);

export const aiAgentRunSteps = pgTable(
  "ai_agent_run_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => aiAgentRuns.id, { onDelete: "cascade" }),
    nodeKey: varchar("node_key", { length: 64 }).notNull(),
    subagentKey: varchar("subagent_key", { length: 64 }),
    status: stepStatusEnum("status").notNull(),
    attempt: smallint("attempt").notNull().default(1),
    inputSnapshot: jsonb("input_snapshot"),
    outputSnapshot: jsonb("output_snapshot"),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("ai_agent_run_steps_run_node_attempt_uniq").on(
      table.runId,
      table.nodeKey,
      table.attempt,
    ),
    index("ai_agent_run_steps_run_status_idx").on(table.runId, table.status),
  ],
);

export const aiToolCalls = pgTable(
  "ai_tool_calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stepId: uuid("step_id")
      .notNull()
      .references(() => aiAgentRunSteps.id, { onDelete: "cascade" }),
    toolKey: varchar("tool_key", { length: 64 }).notNull(),
    args: jsonb("args").notNull(),
    result: jsonb("result"),
    status: toolCallStatusEnum("status").notNull(),
    error: text("error"),
    invokedAt: timestamp("invoked_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [index("ai_tool_calls_step_invoked_idx").on(table.stepId, table.invokedAt)],
);

export const aiUsageEvents = pgTable(
  "ai_usage_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    runId: uuid("run_id").references(() => aiAgentRuns.id, {
      onDelete: "set null",
    }),
    stepId: uuid("step_id").references(() => aiAgentRunSteps.id, {
      onDelete: "set null",
    }),
    modelKey: varchar("model_key", { length: 64 }).notNull(),
    provider: varchar("provider", { length: 32 }).notNull(),
    inputTokens: smallint("input_tokens").notNull().default(0),
    outputTokens: smallint("output_tokens").notNull().default(0),
    latencyMs: smallint("latency_ms"),
    rawUsage: jsonb("raw_usage"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ai_usage_events_run_idx").on(table.runId),
    index("ai_usage_events_user_occurred_idx").on(table.userId, sql`${table.occurredAt} DESC`),
  ],
);

export const agentGraphSnapshots = pgTable(
  "agent_graph_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => aiAgentRuns.id, { onDelete: "cascade" }),
    checkpointId: varchar("checkpoint_id", { length: 128 }).notNull(),
    nodeKey: varchar("node_key", { length: 64 }).notNull(),
    state: jsonb("state").notNull(),
    nextNodes: jsonb("next_nodes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("agent_graph_snapshots_run_checkpoint_uniq").on(table.runId, table.checkpointId),
    index("agent_graph_snapshots_run_created_idx").on(table.runId, sql`${table.createdAt} DESC`),
  ],
);

export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type AiAgentRun = typeof aiAgentRuns.$inferSelect;
export type NewAiAgentRun = typeof aiAgentRuns.$inferInsert;
export type AiAgentRunStep = typeof aiAgentRunSteps.$inferSelect;
export type NewAiAgentRunStep = typeof aiAgentRunSteps.$inferInsert;
export type AiToolCall = typeof aiToolCalls.$inferSelect;
export type NewAiToolCall = typeof aiToolCalls.$inferInsert;
export type AiUsageEvent = typeof aiUsageEvents.$inferSelect;
export type NewAiUsageEvent = typeof aiUsageEvents.$inferInsert;
export type AgentGraphSnapshot = typeof agentGraphSnapshots.$inferSelect;
export type NewAgentGraphSnapshot = typeof agentGraphSnapshots.$inferInsert;
