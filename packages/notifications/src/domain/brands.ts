/**
 * @openbulls/notifications — branded primitive types.
 *
 * Branded UUIDs guard against passing a `Notification.id` where a
 * `Channel.id` is expected (and vice versa). Smart constructors are
 * identity casts — validation happens at the boundary (DB or API),
 * not at every use site.
 */
import type { Brand } from "@openbulls/shared";

/** `notification_channels.id` UUID. */
export type ChannelId = Brand<string, "ChannelId">;
export const ChannelId = (s: string): ChannelId => s as ChannelId;

/** `notifications.id` UUID. */
export type NotificationId = Brand<string, "NotificationId">;
export const NotificationId = (s: string): NotificationId => s as NotificationId;