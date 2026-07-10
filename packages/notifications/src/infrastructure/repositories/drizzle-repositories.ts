/**
 * @openbulls/notifications — Drizzle implementations of the ports.
 *
 * Status guards are intentionally minimal: the dispatcher drives
 * transitions via insert (no UPDATE for status — a `failed` row
 * stays `failed`). The future admin UI will use `markRead` to
 * transition `sent → read`.
 */
import { and, desc, eq } from "drizzle-orm";

import type { DatabaseOrTx } from "@openbulls/db/client";
import {
  type Notification,
  type NotificationChannel,
  notificationChannels,
  notifications,
} from "@openbulls/db/schema/notifications.schema";

import type {
  INotificationChannelRepository,
  INotificationRepository,
  NewNotificationInput,
} from "./ports";

// ── Channel repository ──────────────────────────────────────────────────

export class DrizzleNotificationChannelRepository
  implements INotificationChannelRepository
{
  constructor(private readonly db: DatabaseOrTx) {}

  async findActiveByUser(userId: string): Promise<readonly NotificationChannel[]> {
    return this.db
      .select()
      .from(notificationChannels)
      .where(
        and(
          eq(notificationChannels.userId, userId),
          eq(notificationChannels.isActive, true),
        ),
      );
  }

  async listByUser(userId: string): Promise<readonly NotificationChannel[]> {
    return this.db
      .select()
      .from(notificationChannels)
      .where(eq(notificationChannels.userId, userId));
  }

  async create(input: NotificationChannel): Promise<NotificationChannel> {
    const rows = await this.db
      .insert(notificationChannels)
      .values(input)
      .returning();
    const row = rows[0];
    if (!row) throw new Error("failed to insert notification_channels row");
    return row;
  }

  async getById(id: string): Promise<NotificationChannel | null> {
    const row = await this.db.query.notificationChannels.findFirst({
      where: eq(notificationChannels.id, id),
    });
    return row ?? null;
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    await this.db
      .update(notificationChannels)
      .set({ isActive })
      .where(eq(notificationChannels.id, id));
  }
}

// ── Notification repository ─────────────────────────────────────────────

export class DrizzleNotificationRepository implements INotificationRepository {
  constructor(private readonly db: DatabaseOrTx) {}

  async insert(input: NewNotificationInput): Promise<Notification> {
    const rows = await this.db
      .insert(notifications)
      .values({
        channelId: input.channelId,
        userId: input.userId,
        kind: input.kind as never,
        priority: input.priority,
        title: input.title,
        body: input.body,
        payload: input.payload as object,
        status: input.status,
        sentAt: input.sentAt,
        lastError: input.lastError,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("failed to insert notifications row");
    return row;
  }

  async listByUser(
    userId: string,
    options?: { readonly limit?: number; readonly status?: string },
  ): Promise<readonly Notification[]> {
    const where = options?.status
      ? and(eq(notifications.userId, userId), eq(notifications.status, options.status as never))
      : eq(notifications.userId, userId);
    return this.db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(options?.limit ?? 50);
  }

  async markRead(id: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ status: "read", readAt: new Date() })
      .where(eq(notifications.id, id));
  }

  async getById(id: string): Promise<Notification | null> {
    const row = await this.db.query.notifications.findFirst({
      where: eq(notifications.id, id),
    });
    return row ?? null;
  }
}