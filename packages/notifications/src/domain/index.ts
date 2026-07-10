/**
 * @openbulls/notifications — domain barrel.
 */

// Branded primitive types
export type { ChannelId, NotificationId } from "./brands";
export {
  ChannelId as ChannelIdValue,
  NotificationId as NotificationIdValue,
} from "./brands";

// Channel value object + config types
export {
  type Channel,
  type ChannelConfig,
  type ChannelKind,
  type NewChannel,
  type TelegramConfig,
  channelConfigSchema,
  telegramConfigSchema,
} from "./channel";

// Notification value object + template types
export {
  type NewNotificationRow,
  type NotificationKind,
  type NotificationPriority,
  type NotificationRow,
  type NotificationStatus,
  type NotificationTemplate,
  notificationKindSchema,
  notificationPrioritySchema,
  notificationStatusSchema,
} from "./notification";

// Template renderer
export {
  TEMPLATES,
  type TemplateMap,
  renderTemplate,
  substituteVariables,
} from "./template";

// Domain errors
export {
  ChannelKindNotRegisteredError,
  ChannelSendError,
  NoActiveChannelsError,
  TemplateRenderError,
} from "./errors";
export type { NotificationError } from "./errors";