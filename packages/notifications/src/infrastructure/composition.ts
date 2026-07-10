/**
 * @openbulls/notifications — composition root.
 *
 * `createNotificationServices` builds a fully-bound `NotificationServices`
 * from the same shape of dependencies the agent-worker passes in.
 * Tests use the same factory with mocks; production wires Drizzle
 * repositories and the default channel registry.
 */
import type { DatabaseOrTx } from "@openbulls/db/client";
import { noopLogger, type LoggerLike } from "@openbulls/logger";

import type { IChannelRegistry } from "../application/channel-registry";
import { listChannels } from "../application/list-channels.query";
import { sendNotification } from "../application/send-notification.command";
import type {
  NotificationDeps,
  NotificationServices,
} from "../application/jobs.types";
import type {
  INotificationChannelRepository,
  INotificationRepository,
} from "./repositories/ports";

import { createDefaultChannelRegistry } from "./default-channel-registry.factory";
import {
  DrizzleNotificationChannelRepository,
  DrizzleNotificationRepository,
} from "./repositories/drizzle-repositories";

export interface NotificationServicesHandle {
  readonly services: NotificationServices;
  readonly registry: IChannelRegistry;
  readonly channelRepo: INotificationChannelRepository;
  readonly notificationRepo: INotificationRepository;
}

/**
 * Pure factory. Tests pass mocks; production wires the Drizzle
 * repositories and the default registry.
 */
export function createNotificationServices(
  deps: NotificationDeps,
): NotificationServicesHandle {
  const logger: LoggerLike = deps.logger ?? noopLogger;
  const now: () => Date = deps.now ?? (() => new Date());

  const channelRepo =
    deps.channelRepo ?? new DrizzleNotificationChannelRepository(deps.db);
  const notificationRepo =
    deps.notificationRepo ?? new DrizzleNotificationRepository(deps.db);
  const registry = deps.registry ?? createDefaultChannelRegistry();

  const services: NotificationServices = {
    registry,
    channelRepo,
    notificationRepo,
    async sendNotification(input) {
      return sendNotification(
        {
          db: deps.db,
          registry,
          notificationRepo,
          logger,
          now,
        },
        input,
      );
    },
    async listChannels(userId) {
      return listChannels({ db: deps.db }, userId);
    },
  };

  return { services, registry, channelRepo, notificationRepo };
}

/**
 * Convenience: build a `NotificationServices` with a fresh DB
 * connection. Mirrors `apps/agent-worker`'s call site.
 */
export function createNotificationServicesFromDb(input: {
  readonly db: DatabaseOrTx;
  readonly logger?: LoggerLike;
  readonly now?: () => Date;
}): NotificationServicesHandle {
  return createNotificationServices({
    db: input.db,
    ...(input.logger ? { logger: input.logger } : {}),
    ...(input.now ? { now: input.now } : {}),
  });
}

export { createDefaultChannelRegistry };