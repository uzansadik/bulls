/**
 * @openbulls/notifications — public barrel.
 *
 * Consumers (`apps/agent-worker`, `apps/telegram-bot`, future admin UI)
 * import everything from this entry point. Internal layout
 * (`domain/`, `application/`, `infrastructure/`) stays free to evolve.
 */

// Domain
export * from "./domain";

// Application
export * from "./application";

// Infrastructure (re-exports selected factories + types)
export {
  DrizzleNotificationChannelRepository,
  DrizzleNotificationRepository,
  TelegramChannelSender,
  createDefaultChannelRegistry,
  createNotificationServices,
  createNotificationServicesFromDb,
} from "./infrastructure";
export type {
  INotificationChannelRepository,
  INotificationRepository,
  NewNotificationInput,
  NotificationServicesHandle,
  TelegramSenderDeps,
} from "./infrastructure";