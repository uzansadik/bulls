/**
 * @openbulls/notifications — infrastructure barrel.
 */

export {
  DrizzleNotificationChannelRepository,
  DrizzleNotificationRepository,
} from "./repositories/drizzle-repositories";
export type {
  INotificationChannelRepository,
  INotificationRepository,
  NewNotificationInput,
} from "./repositories/ports";

export { TelegramChannelSender } from "./channels/telegram.channel";
export type { TelegramSenderDeps } from "./channels/telegram.channel";

export {
  createDefaultChannelRegistry,
  createNotificationServices,
  createNotificationServicesFromDb,
} from "./composition";
export type { NotificationServicesHandle } from "./composition";