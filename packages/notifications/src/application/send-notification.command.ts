/**
 * @openbulls/notifications — `sendNotification` command.
 *
 * Core orchestrator. Steps:
 *   1. `findUserChannels(userId)` — list active channels.
 *   2. For each channel:
 *      a. `channel-registry.get(channel.kind)` — sender (or skip +
 *         log if unsupported).
 *      b. `renderTemplate(kind, payload)` → `{ title, body }`.
 *      c. `sender.send({ recipient: channel.config, notification })`
 *      d. Persist a `notifications` row (`sent` or `failed`).
 *   3. Return `DispatchSummary`. Never throws — callers wrap this in
 *      BullMQ handlers and don't want partial-failure noise.
 *
 * Fan-out: one row per channel. Telegram bots get one row; if a user
 * later adds email/web push, each new channel becomes one more row.
 */
import type { LoggerLike } from "@openbulls/logger";

import type {
  Channel,
  NotificationTemplate,
} from "../domain";
import { renderTemplate } from "../domain";
import type { IChannelRegistry } from "./channel-registry";
import type { INotificationRepository } from "../infrastructure/repositories/ports";
import type { NotificationKind, NotificationPriority } from "../domain";
import type { DispatchSummary, NotificationDeps, SendNotificationInput } from "./jobs.types";

export interface SendNotificationDeps {
  readonly db: NotificationDeps["db"];
  readonly registry: IChannelRegistry;
  readonly notificationRepo: INotificationRepository;
  readonly logger: LoggerLike;
  readonly now: () => Date;
}

/**
 * Lower-level entry point. `NotificationServices.sendNotification`
 * is the public façade; tests use this variant with explicit deps.
 */
export async function sendNotification(
  deps: SendNotificationDeps,
  input: SendNotificationInput,
): Promise<DispatchSummary> {
  const startedAt = deps.now();
  const logger = deps.logger;
  const priority: NotificationPriority = input.priority ?? "normal";

  // 1. Render the template once (the same rendered text is sent to
  //    every channel — we don't localize per-channel in Faz 6).
  const rendered = renderTemplate(input.kind as string, input.payload);
  const template: NotificationTemplate = {
    title: rendered.title,
    body: rendered.body,
    kind: input.kind as NotificationKind,
    priority,
    payload: input.payload,
  };

  // 2. Find channels. Inline import to avoid a circular dep at
  //    module-load time (find-user-channels.query depends on schema).
  const { findUserChannels } = await import("./find-user-channels.query");
  const channels = await findUserChannels({ db: deps.db }, input.userId);

  let sent = 0;
  let failed = 0;
  const unsupportedKinds: string[] = [];

  for (const channel of channels) {
    const sender = deps.registry.get(channel.kind);
    if (!sender) {
      unsupportedKinds.push(channel.kind);
      logger.warn(
        "sendNotification: no sender registered for channel kind",
        {
          userId: input.userId,
          channelKind: channel.kind,
        },
      );
      continue;
    }

    let result;
    try {
      result = await sender.send({
        recipient: channel.config as never,
        notification: template,
      });
    } catch (err) {
      // Sender contract says no-throw, but defensive: never lose the row.
      const message = err instanceof Error ? err.message : String(err);
      await persistNotification(deps.notificationRepo, channel, input, template, {
        status: "failed",
        error: message,
      });
      failed += 1;
      logger.error(
        "sendNotification: sender threw",
        { userId: input.userId, channelKind: channel.kind, err: message },
      );
      continue;
    }

    if (result.delivered) {
      await persistNotification(deps.notificationRepo, channel, input, template, {
        status: "sent",
      });
      sent += 1;
    } else {
      await persistNotification(deps.notificationRepo, channel, input, template, {
        status: "failed",
        error: result.error,
      });
      failed += 1;
    }
  }

  return {
    userId: input.userId,
    found: channels.length,
    sent,
    failed,
    durationMs: deps.now().getTime() - startedAt.getTime(),
    unsupportedKinds,
  };
}

/**
 * Insert one row per (channel × notification) pair. Stays private —
 * the orchestrator decides when and how to call it.
 */
async function persistNotification(
  repo: INotificationRepository,
  channel: Channel,
  input: SendNotificationInput,
  template: NotificationTemplate,
  outcome: { status: "sent" | "failed"; error?: string },
): Promise<void> {
  await repo.insert({
    channelId: channel.id,
    userId: input.userId,
    kind: input.kind as NotificationKind,
    priority: template.priority,
    title: template.title,
    body: template.body,
    payload: template.payload,
    status: outcome.status,
    sentAt: outcome.status === "sent" ? new Date() : null,
    lastError: outcome.error ?? null,
  });
}