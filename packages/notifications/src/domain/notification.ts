/**
 * @openbulls/notifications — notification value object + Zod schemas.
 *
 * A `Notification` is the row shape of `notifications`. The dispatcher
 * inserts one row per (channel × notification) pair — i.e. if a user
 * has 2 telegram channels and a `price_alert` arrives, we insert 2
 * rows (one per channel) so the audit trail is per-channel.
 *
 * `status` follows the `executionStatusEnum` model: `pending → sent
 * | failed | read`. `read` is set by the future admin UI; `sent`
 * means the channel.send() resolved true; `failed` carries
 * `lastError` from the channel.
 */
import { z } from "zod";

import {
  notificationKindEnum,
  notificationPriorityEnum,
  notificationStatusEnum,
} from "@openbulls/db/schema/enums";

import type {
  NewNotification,
  Notification,
} from "@openbulls/db/schema/notifications.schema";

/** Allowed notification kinds. Mirrors `notificationKindEnum`. */
export type NotificationKind = (typeof notificationKindEnum.enumValues)[number];

/** Allowed notification priorities. */
export type NotificationPriority =
  (typeof notificationPriorityEnum.enumValues)[number];

/** Allowed notification statuses. */
export type NotificationStatus = (typeof notificationStatusEnum.enumValues)[number];

/**
 * Domain view of a `notifications` row.
 */
export type NotificationRow = Notification;
export type NewNotificationRow = NewNotification;

/**
 * Lightweight, in-memory template the channel sender consumes.
 * `payload` is also stored on the row for downstream tooling (e.g.
 * the future in-app notification feed).
 */
export interface NotificationTemplate {
  readonly title: string;
  readonly body: string;
  readonly kind: NotificationKind;
  readonly priority: NotificationPriority;
  readonly payload: Readonly<Record<string, unknown>>;
}

/**
 * Lightweight zod schemas for runtime validation of payload contracts.
 * The shape is intentionally permissive (`z.unknown()`) — channel-
 * specific validation lives in each channel's `send()` implementation.
 */
export const notificationKindSchema = z.enum(notificationKindEnum.enumValues);
export const notificationPrioritySchema = z.enum(
  notificationPriorityEnum.enumValues,
);
export const notificationStatusSchema = z.enum(notificationStatusEnum.enumValues);