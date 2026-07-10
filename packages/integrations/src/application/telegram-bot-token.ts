/**
 * @openbulls/integrations — Telegram bot token getter.
 *
 * Wraps `@openbulls/config`'s `serverEnv()` so the token is read once
 * (memoized at config level) and re-exported with a stable, narrower
 * name. Used by `apps/agent-worker` (telegram channel sender) and
 * `apps/telegram-bot` (grammy `Bot` instance).
 *
 * Throws at call time when `TELEGRAM_BOT_TOKEN` is unset — config
 * layer already validates this on first access, but a guard here
 * keeps the error message tied to the consumer.
 */
import { serverEnv } from "@openbulls/config";

export function getTelegramBotToken(): string {
  const token = serverEnv().TELEGRAM_BOT_TOKEN;
  if (!token || token.length === 0) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }
  return token;
}

export function getTelegramBotUsername(): string {
  return serverEnv().TELEGRAM_BOT_USERNAME;
}
