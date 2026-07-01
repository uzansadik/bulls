import { sql } from "drizzle-orm";
import {
  boolean,
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

import { aiAgentRuns } from "./ai.schema";
import { user } from "./auth.schema";
import {
  notificationChannelKindEnum,
  notificationKindEnum,
  notificationPriorityEnum,
  notificationStatusEnum,
} from "./enums";

export const notificationChannels = pgTable(
  "notification_channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: notificationChannelKindEnum("kind").notNull(),
    externalId: text("external_id").notNull(),
    config: jsonb("config").notNull().default({}),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("notification_channels_user_kind_external_uniq").on(
      table.userId,
      table.kind,
      table.externalId,
    ),
    index("notification_channels_user_kind_idx").on(table.userId, table.kind),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => notificationChannels.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: notificationKindEnum("kind").notNull(),
    priority: notificationPriorityEnum("priority").notNull().default("normal"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    payload: jsonb("payload"),
    relatedRunId: uuid("related_run_id").references(() => aiAgentRuns.id, {
      onDelete: "set null",
    }),
    status: notificationStatusEnum("status").notNull().default("pending"),
    attempts: smallint("attempts").notNull().default(0),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_user_created_idx").on(table.userId, sql`${table.createdAt} DESC`),
    index("notifications_status_idx").on(table.status),
  ],
);

void varchar;

export type NotificationChannel = typeof notificationChannels.$inferSelect;
export type NewNotificationChannel = typeof notificationChannels.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
