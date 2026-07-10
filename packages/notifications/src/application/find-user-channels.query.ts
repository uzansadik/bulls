/**
 * @openbulls/notifications — `findUserChannels` query.
 *
 * Pulls every active `notification_channels` row for the given user.
 * The dispatcher fans out one `send()` call per channel.
 *
 * Read-only. The query uses the existing `notification_channels_user_kind_idx`
 * to keep latency low as the channel count grows. Result includes
 * only `isActive = true` rows — paused channels stay in the DB but
 * are skipped at dispatch time (the admin UI toggles `isActive`).
 */
import { and, eq } from "drizzle-orm";

import type { DatabaseOrTx } from "@openbulls/db/client";
import {
  type NotificationChannel,
  notificationChannels,
} from "@openbulls/db/schema/notifications.schema";

export interface FindUserChannelsDeps {
  readonly db: DatabaseOrTx;
}

export async function findUserChannels(
  deps: FindUserChannelsDeps,
  userId: string,
): Promise<readonly NotificationChannel[]> {
  return deps.db
    .select()
    .from(notificationChannels)
    .where(
      and(
        eq(notificationChannels.userId, userId),
        eq(notificationChannels.isActive, true),
      ),
    );
}