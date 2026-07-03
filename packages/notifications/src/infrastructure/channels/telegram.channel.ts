/**
 * @openbulls/notifications — Telegram channel sender.
 *
 * Lazily creates a single `Bot` instance at boot (shared across all
 * senders in the registry). `send()` calls `bot.api.sendMessage` with
 * Markdown parse mode. Telegram returns `{ ok: true, result: Message }`
 * on success; we coerce non-OK responses into `{ delivered: false,
 * transient }` so the dispatcher keeps moving.
 *
 * Failure modes:
 *   - 4xx (bot blocked, invalid chatId) → `transient: false`
 *   - 429 (rate limit) → `transient: true`
 *   - 5xx / network → `transient: true`
 *
 * The bot token is resolved via `getTelegramBotToken()` from
 * `@openbulls/integrations` — no `process.env` access here.
 */
import { Bot, GrammyError } from "grammy";

import { getTelegramBotToken } from "@openbulls/integrations";

import type {
  ChannelSendResult,
  IChannelSender,
} from "../../application/channels/ports";
import type { NotificationTemplate, TelegramConfig } from "../../domain";

export interface TelegramSenderDeps {
  readonly bot?: Bot;
}

export class TelegramChannelSender implements IChannelSender<TelegramConfig> {
  readonly kind = "telegram" as const;
  readonly #bot: Bot;

  constructor(deps: TelegramSenderDeps = {}) {
    this.#bot = deps.bot ?? new Bot(getTelegramBotToken());
  }

  async send(input: {
    readonly recipient: TelegramConfig;
    readonly notification: NotificationTemplate;
  }): Promise<ChannelSendResult> {
    const text = `*${input.notification.title}*\n\n${input.notification.body}`;
    try {
      await this.#bot.api.sendMessage(input.recipient.chatId, text, {
        parse_mode: "Markdown",
      });
      return { delivered: true, sentAt: new Date() };
    } catch (err) {
      const { transient, message } = classifyTelegramError(err);
      return { delivered: false, error: message, transient };
    }
  }
}

/**
 * Map a grammy `ApiError` (or any thrown value) to `{ transient,
 * message }`. Telegram errors carry `error_code`; rate-limit (429) is
 * transient; 4xx is permanent.
 */
function classifyTelegramError(err: unknown): {
  transient: boolean;
  message: string;
} {
  if (err instanceof GrammyError) {
    const code = err.error_code;
    if (code === 429) return { transient: true, message: "rate_limited" };
    if (code >= 500) return { transient: true, message: `telegram_${code}` };
    if (code >= 400) return { transient: false, message: `telegram_${code}` };
  }
  if (err instanceof Error) {
    // Network / DNS — always transient.
    return { transient: true, message: err.message };
  }
  return { transient: false, message: String(err) };
}