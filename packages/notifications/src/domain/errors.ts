/**
 * @openbulls/notifications — domain error taxonomy.
 *
 * Mirrors the conventions used by `@openbulls/automation` and
 * `@openbulls/jobs`: each error extends `AppError`, has a stable
 * `code` literal, and lives inside a discriminated union for
 * `Result<T, NotificationError>`.
 *
 * Failure policy: every channel.send() throws `ChannelSendError` with
 * `transient: true|false` so the dispatcher knows whether to mark
 * the notification row `failed` and move on, or to throw so BullMQ
 * retries.
 */
import { AppError } from "@openbulls/shared";

/**
 * Raised when `findUserChannels` returns an empty list for a user.
 * The dispatcher treats this as a no-op (no fan-out, no failure).
 */
export class NoActiveChannelsError extends AppError {
  readonly code = "notifications/no-active-channels" as const;

  constructor(
    message: string,
    readonly data: { readonly userId: string },
  ) {
    super(message);
  }
}

/**
 * Raised when a channel sender returns an `error` result (delivery
 * failed but recoverable). `transient` signals whether BullMQ should
 * retry the whole dispatch (`true`) or just mark the row `failed`
 * (`false`).
 */
export class ChannelSendError extends AppError {
  readonly code = "notifications/channel-send" as const;

  constructor(
    message: string,
    readonly data: {
      readonly channelKind: string;
      readonly userId: string;
      readonly transient: boolean;
      readonly cause?: string;
    },
  ) {
    super(message);
  }
}

/**
 * Raised when the template engine cannot resolve a required variable.
 * Templates are static per notification kind; a missing var indicates
 * either a template bug or a malformed payload from the upstream
 * dispatcher.
 */
export class TemplateRenderError extends AppError {
  readonly code = "notifications/template-render" as const;

  constructor(
    message: string,
    readonly data: { readonly kind: string; readonly missingVar?: string },
  ) {
    super(message);
  }
}

/**
 * Raised when the registry has no sender registered for the requested
 * channel kind. Currently impossible (only telegram is registered in
 * Faz 6) but kept for forward compatibility when more channels land.
 */
export class ChannelKindNotRegisteredError extends AppError {
  readonly code = "notifications/channel-kind-not-registered" as const;

  constructor(
    message: string,
    readonly data: { readonly channelKind: string },
  ) {
    super(message);
  }
}

/** Convenience union used everywhere this package returns `Result<T, E>`. */
export type NotificationError =
  | NoActiveChannelsError
  | ChannelSendError
  | TemplateRenderError
  | ChannelKindNotRegisteredError;