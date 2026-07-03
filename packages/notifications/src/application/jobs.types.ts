/**
 * @openbulls/notifications — application-layer types.
 *
 * `NotificationDeps` is the constructor input for
 * `createNotificationServices`. Each use case takes its own subset;
 * defaults (noopLogger, `now = () => new Date()`) cover tests.
 *
 * `NotificationServices` is the public surface returned by the
 * composition root. Consumers (`apps/agent-worker`,
 * `apps/telegram-bot`) only ever receive a fully-bound object.
 */
import type { DatabaseOrTx } from "@openbulls/db/client";
import type { LoggerLike } from "@openbulls/logger";

import type { IChannelRegistry } from "./channel-registry";
import type {
  INotificationChannelRepository,
  INotificationRepository,
} from "../infrastructure/repositories/ports";
import type { NotificationKind } from "../domain";

export interface NotificationDeps {
  readonly db: DatabaseOrTx;
  readonly registry?: IChannelRegistry;
  readonly channelRepo?: INotificationChannelRepository;
  readonly notificationRepo?: INotificationRepository;
  readonly logger?: LoggerLike;
  readonly now?: () => Date;
}

export interface SendNotificationInput {
  readonly userId: string;
  readonly kind: NotificationKind;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly priority?: "low" | "normal" | "high" | "urgent";
}

export interface DispatchSummary {
  readonly userId: string;
  readonly found: number;
  readonly sent: number;
  readonly failed: number;
  readonly durationMs: number;
  /** Channel kinds that had no registered sender; logged but not raised. */
  readonly unsupportedKinds: readonly string[];
}

export interface NotificationServices {
  readonly registry: IChannelRegistry;
  readonly channelRepo: INotificationChannelRepository;
  readonly notificationRepo: INotificationRepository;
  /**
   * Core entry point. Pulls the user's active channels, renders the
   * template, calls each registered sender, and persists a row per
   * (channel × notification) pair. Returns a summary; never throws.
   */
  readonly sendNotification: (input: SendNotificationInput) => Promise<DispatchSummary>;
  /** Ops query — every channel row for the user (active or not). */
  readonly listChannels: (userId: string) => Promise<readonly import("../domain").Channel[]>;
}