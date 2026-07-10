/**
 * @openbulls/notifications — channel sender port.
 *
 * Each channel implementation (telegram now, email/web push in Faz 8)
 * implements `IChannelSender<TConfig>`. The `send()` call returns a
 * `ChannelSendResult` discriminated by `delivered`. Transient failures
 * (network blip, rate limit) return `{ delivered: false, error }` —
 * the dispatcher keeps the row status as `failed` (we don't block on
 * a single channel; fan-out continues).
 *
 * Why not throw on transient failure? Because the dispatcher is
 * iterating a *list* of channels. One channel's network blip should
 * not skip the next channel's delivery. Permanent failures (bot
 * blocked, invalid chatId) likewise mark `failed` but don't retry.
 */
import type { ChannelConfig, ChannelKind, NotificationTemplate } from "../../domain";

/**
 * The sender knows its own `kind` (it's a `telegram` sender or an
 * `email` sender, never both). The discriminator is the same string
 * the DB enum uses.
 */
export interface IChannelSender<TConfig extends ChannelConfig> {
  readonly kind: ChannelKind;
  send(input: {
    readonly recipient: TConfig;
    readonly notification: NotificationTemplate;
  }): Promise<ChannelSendResult>;
}

export type ChannelSendResult =
  | { readonly delivered: true; readonly sentAt: Date }
  | { readonly delivered: false; readonly error: string; readonly transient: boolean };