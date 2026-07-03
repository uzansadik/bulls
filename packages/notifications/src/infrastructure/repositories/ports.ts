/**
 * @openbulls/notifications — repository ports.
 *
 * Two narrow ports, one per DB table. `INotificationChannelRepository`
 * is read-heavy (the dispatcher only reads `findActive`); future admin
 * tooling will write here. `INotificationRepository` is write-heavy
 * (every dispatch inserts one row per channel) and read-light
 * (admin UI list).
 */
import type {
  Notification,
  NotificationChannel,
} from "@openbulls/db/schema/notifications.schema";

export interface INotificationChannelRepository {
  /**
   * Active channels for the user. `isActive = true` only — paused
   * channels stay in the DB but are skipped at dispatch time.
   */
  findActiveByUser(userId: string): Promise<readonly NotificationChannel[]>;
  /** Every channel row for the user (active or not). Ops / admin UI. */
  listByUser(userId: string): Promise<readonly NotificationChannel[]>;
  /** Used by `/start <token>` in apps/telegram-bot. */
  create(input: NotificationChannel): Promise<NotificationChannel>;
  getById(id: string): Promise<NotificationChannel | null>;
  /** Toggle `isActive` for `/notify on|off`. */
  setActive(id: string, isActive: boolean): Promise<void>;
}

export interface NewNotificationInput {
  readonly channelId: string;
  readonly userId: string;
  readonly kind: string;
  readonly priority: "low" | "normal" | "high" | "urgent";
  readonly title: string;
  readonly body: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly status: "sent" | "failed";
  readonly sentAt: Date | null;
  readonly lastError: string | null;
}

export interface INotificationRepository {
  /** Insert a row. Called once per (channel × notification) pair. */
  insert(input: NewNotificationInput): Promise<Notification>;
  /** Admin UI list (paginated in the future). */
  listByUser(
    userId: string,
    options?: { readonly limit?: number; readonly status?: string },
  ): Promise<readonly Notification[]>;
  markRead(id: string): Promise<void>;
  getById(id: string): Promise<Notification | null>;
}