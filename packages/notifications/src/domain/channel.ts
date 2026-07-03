/**
 * @openbulls/notifications — channel value object + Zod schemas.
 *
 * A `Channel` is the row shape of `notification_channels`. We only
 * support the `telegram` kind in Faz 6 (email + web push land in
 * Faz 8). The `config` column is a JSONB blob; for telegram it holds
 * the chatId + optional languageCode.
 *
 * Why a discriminated `ChannelConfig` union: the `send()` port takes
 * `recipient: TConfig` where `TConfig` is per-channel. The dispatcher
 * narrows the config type before calling the sender, so a future email
 * sender can't accidentally accept a telegram chatId.
 */
import { z } from "zod";

import {
  notificationChannelKindEnum,
} from "@openbulls/db/schema/enums";

import type {
  NotificationChannel,
  NewNotificationChannel,
} from "@openbulls/db/schema/notifications.schema";

/**
 * Allowed channel kinds. Only `"telegram"` is wired in Faz 6; the
 * enum itself is shared with the DB schema and reserved for future
 * kinds (email/web push).
 */
export type ChannelKind = (typeof notificationChannelKindEnum.enumValues)[number];

/**
 * Telegram-specific config. `chatId` is what grammy needs to address
 * a private chat / group. `languageCode` is reserved for i18n in the
 * template renderer (Faz 8+).
 */
export interface TelegramConfig {
  readonly chatId: string;
  readonly languageCode?: string;
}

export const telegramConfigSchema = z.object({
  chatId: z.string().min(1),
  languageCode: z.string().optional(),
});

/**
 * Discriminated union of every config shape. Faz 6 only includes
 * telegram; adding email later means `ChannelConfig = TelegramConfig
 * | EmailConfig` and updating `channel-registry.ts`.
 */
export type ChannelConfig = TelegramConfig;

/**
 * Zod schema for the `config` JSONB column. Discriminated by `kind`
 * at validation time. Today only telegram is enabled; other kinds
 * will fail validation with a clear error.
 */
export const channelConfigSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("telegram"),
    config: telegramConfigSchema,
  }),
]);

/**
 * Domain view of a `notification_channels` row. Structurally
 * identical to the Drizzle-inferred type — re-exported so application
 * code imports the domain name consistently.
 */
export type Channel = NotificationChannel;
export type NewChannel = NewNotificationChannel;