/**
 * @openbulls/notifications — `listChannels` query (admin / ops).
 *
 * Returns every `notification_channels` row for the user (active or
 * not). Used by the admin UI (Faz 8) and by `/notify on|off` in the
 * Telegram bot. The dispatcher itself only cares about active rows
 * (see `findUserChannels`).
 */
import { eq } from "drizzle-orm";

import type { DatabaseOrTx } from "@openbulls/db/client";
import {
  type NotificationChannel,
  notificationChannels,
} from "@openbulls/db/schema/notifications.schema";

export interface ListChannelsDeps {
  readonly db: DatabaseOrTx;
}

export async function listChannels(
  deps: ListChannelsDeps,
  userId: string,
): Promise<readonly NotificationChannel[]> {
  return deps.db
    .select()
    .from(notificationChannels)
    .where(eq(notificationChannels.userId, userId));
}