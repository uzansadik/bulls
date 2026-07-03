/**
 * @openbulls/notifications — application barrel.
 */

export {
  type IChannelRegistry,
  InMemoryChannelRegistry,
  ChannelKindAlreadyRegisteredError,
} from "./channel-registry";

export type { IChannelSender, ChannelSendResult } from "./channels/ports";

export { findUserChannels } from "./find-user-channels.query";
export type { FindUserChannelsDeps } from "./find-user-channels.query";

export { listChannels } from "./list-channels.query";
export type { ListChannelsDeps } from "./list-channels.query";

export { sendNotification } from "./send-notification.command";
export type { SendNotificationDeps } from "./send-notification.command";

export type {
  DispatchSummary,
  NotificationDeps,
  NotificationServices,
  SendNotificationInput,
} from "./jobs.types";